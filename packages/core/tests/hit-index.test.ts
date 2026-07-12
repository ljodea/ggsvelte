/**
 * Unified hit index + quadtree + strata planning (M2 interaction depth).
 * These are pure computations over Scene geometry — no DOM — so they run
 * under bun; the browser-level event wiring is covered by component tests.
 */
import { describe, expect, it } from "bun:test";

import { gg, aes } from "@ggsvelte/spec";

import { buildHitIndex } from "../src/dom/hit-index.ts";
import { StaticQuadtree } from "../src/dom/quadtree.ts";
import { runPipeline } from "../src/pipeline.ts";
import type { PointsBatch } from "../src/scene.ts";
import { planStrata } from "../src/strata.ts";

const size = { width: 640, height: 400 };

describe("StaticQuadtree", () => {
  it("nearestWithin finds the closest point inside the radius, exactly", () => {
    const n = 2000;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    // Deterministic pseudo-grid with jitter-free structure.
    for (let i = 0; i < n; i++) {
      xs[i] = (i % 50) * 12.5;
      ys[i] = Math.floor(i / 50) * 9.75;
    }
    const tree = new StaticQuadtree(xs, ys);
    // Brute-force cross-check at 25 probe positions.
    for (let probe = 0; probe < 25; probe++) {
      const px = probe * 23.7;
      const py = probe * 14.1;
      const radius = 8;
      let best = -1;
      let bestD2 = radius * radius;
      for (let i = 0; i < n; i++) {
        const d2 = (xs[i]! - px) ** 2 + (ys[i]! - py) ** 2;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      expect(tree.nearestWithin(px, py, radius)).toBe(best);
    }
  });

  it("queryRect returns exactly the points in the rect", () => {
    const xs = Float64Array.from([0, 10, 20, 30, 40]);
    const ys = Float64Array.from([0, 10, 20, 30, 40]);
    const tree = new StaticQuadtree(xs, ys);
    expect(tree.queryRect(5, 5, 35, 35).toSorted((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(tree.queryRect(100, 100, 200, 200)).toEqual([]);
  });

  it("handles duplicate coordinates without infinite splitting", () => {
    const xs = new Float64Array(100).fill(5);
    const ys = new Float64Array(100).fill(5);
    const tree = new StaticQuadtree(xs, ys);
    expect(tree.queryRect(0, 0, 10, 10)).toHaveLength(100);
  });
});

describe("buildHitIndex", () => {
  const rows = [
    { x: 1, y: 10, cls: "a" },
    { x: 2, y: 20, cls: "b" },
    { x: 3, y: 15, cls: "a" },
    { x: 4, y: 25, cls: "b" },
  ];

  function pointScene() {
    return runPipeline(
      gg(rows, aes({ x: "x", y: "y", color: "cls" }))
        .geomPoint()
        .spec(),
      size,
    );
  }

  it("resolves the correct source row for a point, misses resolve null", () => {
    const model = pointScene();
    const scene = model.scene;
    const panel = scene.panels[0]!;
    const batch = scene.batches[0] as PointsBatch;
    const index = buildHitIndex(scene);
    for (let j = 0; j < batch.rowIndex.length; j++) {
      const hit = index.hitTest(
        panel.x + batch.positions[j * 2]!,
        panel.y + batch.positions[j * 2 + 1]!,
      );
      expect(hit).not.toBeNull();
      expect(hit!.rowIndex).toBe(batch.rowIndex[j]!);
      expect(hit!.layerIndex).toBe(0);
    }
    // A probe in empty plot area (panel corner away from data) misses.
    expect(index.hitTest(panel.x + 1, panel.y + 1)).toBeNull();
    // A probe outside the panel misses even if a mark sits at the edge.
    expect(index.hitTest(panel.x - 10, panel.y - 10)).toBeNull();
  });

  it("tolerance is respected: hits within size + tolerance, misses beyond", () => {
    const model = pointScene();
    const scene = model.scene;
    const panel = scene.panels[0]!;
    const batch = scene.batches[0] as PointsBatch;
    const px = panel.x + batch.positions[0]!;
    const py = panel.y + batch.positions[1]!;
    const index = buildHitIndex(scene, { tolerance: 3 });
    expect(index.hitTest(px + batch.size + 2.5, py)).not.toBeNull();
    expect(index.hitTest(px + batch.size + 3.5, py)).toBeNull();
  });

  it("rects use exact containment; the topmost stacked segment wins", () => {
    const stacked = runPipeline(
      gg(
        [
          { cat: "a", kind: "u", v: 3 },
          { cat: "a", kind: "w", v: 5 },
        ],
        aes({ x: "cat", y: "v", fill: "kind" }),
      )
        .geomCol()
        .spec(),
      size,
    );
    const scene = stacked.scene;
    const panel = scene.panels[0]!;
    const index = buildHitIndex(scene);
    // Probe near the top of the stack (v in (5, 8]) -> the "u" segment
    // (first-seen stacks on top), which is source row 0.
    const yScale = stacked.scales.y as { normalize(v: number): number };
    const yAt = (v: number) => panel.y + panel.height - yScale.normalize(v) * panel.height;
    const xCenter = panel.x + panel.width / 2;
    expect(index.hitTest(xCenter, yAt(6.5))!.rowIndex).toBe(0);
    expect(index.hitTest(xCenter, yAt(2))!.rowIndex).toBe(1);
    // Outside any band: miss (exact containment, no slop).
    expect(index.hitTest(panel.x + 2, yAt(2))).toBeNull();
  });

  it("lines hit within stroke proximity; areas by containment", () => {
    const lineModel = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomLine({ linewidth: 2 })
        .spec(),
      size,
    );
    const scene = lineModel.scene;
    const panel = scene.panels[0]!;
    const batch = scene.batches[0]!;
    if (batch.kind !== "paths") throw new Error("expected paths");
    const index = buildHitIndex(scene);
    // Midpoint of the first edge: within tolerance of the stroke.
    const mx = panel.x + (batch.positions[0]! + batch.positions[2]!) / 2;
    const my = panel.y + (batch.positions[1]! + batch.positions[3]!) / 2;
    const hit = index.hitTest(mx, my);
    expect(hit).not.toBeNull();
    expect(hit!.kind).toBe("paths");
    // 10px above the stroke: miss.
    expect(index.hitTest(mx, my - 12)).toBeNull();

    const areaModel = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomArea()
        .spec(),
      size,
    );
    const areaPanel = areaModel.scene.panels[0]!;
    const areaIndex = buildHitIndex(areaModel.scene);
    // Deep inside the filled region (just above the baseline, mid-x).
    const inside = areaIndex.hitTest(
      areaPanel.x + areaPanel.width / 2,
      areaPanel.y + areaPanel.height - 5,
    );
    expect(inside).not.toBeNull();
    expect(inside!.kind).toBe("paths");
  });

  it("hit resolution works identically across facet panels (source rows)", () => {
    const facetRows = rows.map((r, i) => ({ ...r, g: i < 2 ? "p1" : "p2" }));
    const model = runPipeline(
      gg(facetRows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({ wrap: "g" })
        .spec(),
      size,
    );
    const scene = model.scene;
    const index = buildHitIndex(scene);
    for (const batch of scene.batches) {
      if (batch.kind !== "points") continue;
      const panel = scene.panels[batch.panelIndex]!;
      for (let j = 0; j < batch.rowIndex.length; j++) {
        const hit = index.hitTest(
          panel.x + batch.positions[j * 2]!,
          panel.y + batch.positions[j * 2 + 1]!,
        );
        expect(hit!.panelIndex).toBe(batch.panelIndex);
        expect(hit!.rowIndex).toBe(batch.rowIndex[j]!);
      }
    }
  });

  it("queryRect returns unique source rows for a brush rectangle", () => {
    const model = pointScene();
    const scene = model.scene;
    const panel = scene.panels[0]!;
    const index = buildHitIndex(scene);
    const all = index.queryRect(panel.x, panel.y, panel.x + panel.width, panel.y + panel.height);
    expect(all.map((h) => h.rowIndex).toSorted((a, b) => a! - b!)).toEqual([0, 1, 2, 3]);
    const none = index.queryRect(0, 0, 5, 5);
    expect(none).toEqual([]);
  });
});

describe("planStrata", () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ x: i, y: i, label: `p${i}` }));

  it("groups contiguous same-backend batches; glyphs stay SVG", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint({ render: "canvas" })
        .geomLine({ render: "canvas" })
        .geomText({ aes: { label: "label" } })
        .spec(),
      size,
    );
    const strata = planStrata(model.scene, model.layerBackends);
    expect(strata.map((s) => s.backend)).toEqual(["canvas", "svg"]);
    expect(strata[0]!.batches).toHaveLength(2);
    expect(strata[1]!.batches[0]!.kind).toBe("glyphs");
  });

  it("svg/canvas/svg sandwich from interleaved hints", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomLine({ render: "svg" })
        .geomPoint({ render: "canvas" })
        .geomLine({ render: "svg", linewidth: 0.5 })
        .spec(),
      size,
    );
    const strata = planStrata(model.scene, model.layerBackends);
    expect(strata.map((s) => s.backend)).toEqual(["svg", "canvas", "svg"]);
  });

  it("a text layer forced to canvas still renders as an SVG stratum", () => {
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomText({ aes: { label: "label" }, render: "canvas" })
        .spec(),
      size,
    );
    const strata = planStrata(model.scene, model.layerBackends);
    expect(strata.map((s) => s.backend)).toEqual(["svg"]);
  });
});
