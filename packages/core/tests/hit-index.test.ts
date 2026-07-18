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
import type { PointsBatch, Scene } from "../src/scene.ts";
import { planStrata } from "../src/strata.ts";

const size = { width: 640, height: 400 };

/** Minimal scene for synthetic rect batches (panel origin at 0,0). */
function rectScene(rects: Float32Array, rowIndex?: Uint32Array): Scene {
  const n = rects.length / 4;
  return {
    width: 640,
    height: 400,
    panels: [
      {
        id: "panel:all",
        x: 0,
        y: 0,
        width: 640,
        height: 400,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
    ],
    batches: [
      {
        kind: "rects",
        layerIndex: 0,
        panelIndex: 0,
        rects,
        rowIndex: rowIndex ?? Uint32Array.from({ length: n }, (_, i) => i),
        fill: null,
        alpha: 1,
      },
    ],
    axes: { x: { ticks: [], title: "" }, y: { ticks: [], title: "" } },
    grid: { x: [], y: [] },
    legends: [],
    theme: {} as Scene["theme"],
    title: "",
    subtitle: "",
    caption: "",
  };
}

/** Count numeric index reads on a Float32Array (complexity guard). */
function instrumentReads(source: Float32Array): {
  view: Float32Array;
  reads: () => number;
  reset: () => void;
} {
  let reads = 0;
  // TypedArray methods reject Proxy as `this`; forward length/methods to the
  // underlying buffer and only trap numeric element gets for the guard.
  const view = new Proxy(source, {
    get(target, property): unknown {
      if (typeof property === "string" && /^\d+$/.test(property)) {
        reads++;
        return target[Number(property)];
      }
      if (property === "length") return target.length;
      const value = (target as unknown as Record<string | symbol, unknown>)[property];
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
  }) as Float32Array;
  return {
    view,
    reads: () => reads,
    reset: () => {
      reads = 0;
    },
  };
}

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

  it("queryRect includes rects that intersect the brush (anchor at raw origin)", () => {
    // Two bars: one under the brush, one far away. Negative height still hits via AABB.
    const rects = new Float32Array([
      10,
      50,
      20,
      -30, // covers y 20..50, x 10..30 — brush at 15..25, 30..40
      200,
      10,
      10,
      10, // far
    ]);
    const scene = rectScene(rects);
    const index = buildHitIndex(scene);
    const hits = index.queryRect(15, 30, 25, 40);
    expect(hits.map((h) => h.rowIndex)).toEqual([0]);
    expect(hits[0]!.x).toBe(20); // 10 + 20/2
    expect(hits[0]!.y).toBe(50); // raw origin y (not minY)
  });

  it("hitTest does not scan every far rect on a dense bar field", () => {
    // Complexity: linear rects walk was O(R); size-class AABB shortlist is O(log R + k).
    const count = 4_000;
    const raw = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const col = i % 50;
      const row = Math.floor(i / 50);
      raw[i * 4] = 100 + col * 10;
      raw[i * 4 + 1] = 100 + row * 10;
      raw[i * 4 + 2] = 2;
      raw[i * 4 + 3] = 2;
    }
    // One bar covering the probe at (10,10).
    raw[0] = 0;
    raw[1] = 0;
    raw[2] = 20;
    raw[3] = 20;
    const instrumented = instrumentReads(raw);
    const scene = rectScene(instrumented.view);
    const index = buildHitIndex(scene);
    instrumented.reset();

    const hit = index.hitTest(10, 10);
    expect(hit?.rowIndex).toBe(0);
    // Winner reads 3 components of batch.rects (x,y,w); linear scan would read ~4*R.
    expect(instrumented.reads()).toBeLessThan(32);
    expect(instrumented.reads()).toBeLessThan(count / 50);

    instrumented.reset();
    // Empty pocket between the cover bar (0..20) and the far grid (≥100).
    expect(index.hitTest(50, 50)).toBeNull();
    // Miss must not walk every far bar via batch.rects.
    expect(instrumented.reads()).toBe(0);
  });

  it("one giant rect does not force-scan every small far rect", () => {
    // Size classes: a full-plot bar must not expand the small-bar class query.
    const count = 2_000;
    const raw = new Float32Array((count + 1) * 4);
    raw[0] = 0;
    raw[1] = 0;
    raw[2] = 200;
    raw[3] = 120;
    for (let i = 0; i < count; i++) {
      const col = i % 40;
      const row = Math.floor(i / 40);
      raw[(i + 1) * 4] = 300 + col * 8;
      raw[(i + 1) * 4 + 1] = 300 + row * 8;
      raw[(i + 1) * 4 + 2] = 2;
      raw[(i + 1) * 4 + 3] = 2;
    }
    const instrumented = instrumentReads(raw);
    const scene = rectScene(instrumented.view);
    const index = buildHitIndex(scene);
    instrumented.reset();

    // Probe inside the giant only — small far bars must not be refined via batch.rects.
    const hit = index.hitTest(50, 50);
    expect(hit?.rowIndex).toBe(0);
    expect(instrumented.reads()).toBeLessThan(32);

    instrumented.reset();
    // Tight brush over empty left corner of giant (still only giant class hits).
    const brushed = index.queryRect(10, 10, 20, 20);
    expect(brushed.map((h) => h.rowIndex)).toEqual([0]);
    // queryRect only reads batch.rects for shortlisted hits (3 components each).
    expect(instrumented.reads()).toBeLessThan(32);
    expect(instrumented.reads()).toBeLessThan(count / 20);
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
