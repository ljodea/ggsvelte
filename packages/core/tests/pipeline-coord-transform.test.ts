import { describe, expect, it } from "bun:test";

import { aes, coord_transform, gg, scaleXLog10 } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import type { PathsBatch } from "../src/scene.ts";
import { sceneToSVGString } from "../src/render-svg-scene.ts";

const size = { width: 640, height: 360 };

function path(model: ReturnType<typeof runPipeline>): PathsBatch {
  const batch = model.scene.batches.find((candidate) => candidate.kind === "paths");
  if (batch?.kind !== "paths") throw new Error("expected paths batch");
  return batch;
}

function candidates(model: ReturnType<typeof runPipeline>) {
  return Array.from({ length: model.candidates.size }, (_, id) =>
    model.candidates.candidate(id),
  ).filter((candidate) => candidate !== null);
}

describe("pipeline post-stat coord_transform", () => {
  it("projects points and axis ticks after identity scale training", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 10, y: 2 },
          { x: 100, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .scales({
          x: {
            type: "linear",
            domain: [1, 100],
            expand: { mult: 0, add: 0 },
            breaks: [1, 10, 100],
          },
        })
        .coord(coord_transform({ x: { transform: "log10", expand: false } }))
        .spec(),
      size,
    );
    expect(model.scales.x.type).toBe("linear");
    if (model.scales.x.type !== "linear") throw new Error("expected continuous x");
    expect(model.scales.x.transform).toBe("identity");
    const points = model.scene.batches.find((batch) => batch.kind === "points");
    if (points?.kind !== "points") throw new Error("expected points");
    const [x1, x10, x100] = [points.positions[0]!, points.positions[2]!, points.positions[4]!];
    expect(x10 - x1).toBeCloseTo(x100 - x10, 4);
    const tick10 = model.scene.axes.x.ticks.find((tick) => tick.value === 10);
    expect(tick10?.pos).toBeCloseTo(model.scene.panels[0]!.width / 2, 4);
    expect(
      model.scene.panels[0]!.grid.x.some(
        (position) => Math.abs(position - model.scene.panels[0]!.width / 2) < 0.0001,
      ),
    ).toBe(true);
  });

  it("keeps projected grid breaks while suppressing colliding axis labels", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 1000, y: 2 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .scales({
          x: {
            type: "linear",
            domain: [1, 1000],
            expand: { mult: 0, add: 0 },
            breaks: [200, 400, 600, 800, 1000],
          },
        })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      { width: 320, height: 360 },
    );
    const axis = model.scene.panels[0]!.axisX!;
    expect(model.scene.panels[0]!.grid.x).toHaveLength(5);
    expect(axis.filter((tick) => tick.label !== "")).toHaveLength(3);
    expect(axis.find((tick) => tick.value === 1000)?.label).toBe("1,000");
  });

  it("omits ticks outside exact coordinate limits without changing scale breaks", () => {
    const model = runPipeline(
      gg(
        [
          { x: 0, y: 1 },
          { x: 100, y: 2 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .scales({
          x: {
            type: "linear",
            domain: [0, 100],
            expand: { mult: 0, add: 0 },
            breaks: [0, 20, 50, 80, 100],
          },
        })
        .coordTransform({ x: { transform: "identity", limits: [20, 80], expand: false } })
        .spec(),
      size,
    );
    expect(model.scene.panels[0]!.axisX?.map((tick) => tick.value)).toEqual([20, 50, 80]);
    expect(model.scene.panels[0]!.grid.x).toHaveLength(3);
  });

  it("builds independent coordinate projectors for free-scale facets", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1, group: "small" },
          { x: 10, y: 2, group: "small" },
          { x: 100, y: 1, group: "large" },
          { x: 1000, y: 2, group: "large" },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .facet({ wrap: "group", scales: "free_x" })
        .coordTransform({ x: "log10" })
        .spec(),
      size,
    );
    expect(model.coordProjectors).toHaveLength(2);
    expect(model.coordProjectors[0]!.x.coordinateDomain).not.toEqual(
      model.coordProjectors[1]!.x.coordinateDomain,
    );
    const pointBatches = model.scene.batches.filter((batch) => batch.kind === "points");
    expect(pointBatches).toHaveLength(2);
    expect(Array.from(pointBatches[0]!.positions)).toEqual(Array.from(pointBatches[1]!.positions));
  });

  it("keeps the identity-scale smooth fit while rendering through coord log", () => {
    const rows = Array.from({ length: 24 }, (_, i) => ({ x: i + 1, y: Math.sqrt(i + 1) }));
    const base = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", se: false, n: 12 })
        .spec(),
      size,
    );
    const coord = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", se: false, n: 12 })
        .coordTransform({ x: "log10" })
        .spec(),
      size,
    );
    const scaled = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomSmooth({ method: "lm", se: false, n: 12 })
        .scales(scaleXLog10())
        .spec(),
      size,
    );
    expect(candidates(coord).map((candidate) => candidate.yValue)).toEqual(
      candidates(base).map((candidate) => candidate.yValue),
    );
    expect(candidates(coord).map((candidate) => candidate.yValue)).not.toEqual(
      candidates(scaled).map((candidate) => candidate.yValue),
    );
    expect(Array.from(path(coord).positions)).not.toEqual(Array.from(path(base).positions));
  });

  it("coordinate limits do not filter/re-stat source rows", () => {
    const rows = [1, 10, 100].map((x) => ({ x, y: x }));
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordTransform({
          x: { transform: "log10", limits: [10, 100], expand: false },
        })
        .spec(),
      size,
    );
    expect(model.candidates.size).toBe(3);
    expect(candidates(model).map((candidate) => candidate.xValue)).toEqual([1, 10, 100]);
  });

  it("rejects non-identity transformed coordinates on band axes", () => {
    expect(() =>
      runPipeline(
        gg(
          [
            { x: "a", y: 1 },
            { x: "b", y: 2 },
          ],
          aes({ x: "x", y: "y" }),
        )
          .geomPoint()
          .coordTransform({ x: "log10" })
          .spec(),
        size,
      ),
    ).toThrow(expect.objectContaining({ code: "coord-transform-continuous" }));
  });

  it("projects continuous rectangle edges instead of reusing linear pixel widths", () => {
    const model = runPipeline(
      gg(
        [
          { x: 100, y: 1 },
          { x: 200, y: 2 },
          { x: 400, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomCol()
        .scales({ x: { type: "linear", domain: [50, 450], expand: { mult: 0, add: 0 } } })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches.find((candidate) => candidate.kind === "rects");
    const scale = model.scales.x;
    if (batch?.kind !== "rects" || scale.type === "band")
      throw new Error("expected continuous rects");
    const panel = model.scene.panels[0]!;
    const projector = model.coordProjectors[0]!.x;
    const edge = (value: number) =>
      projector.projectFraction(scale.normalizeTransformed(value)) * panel.width;
    const expectedLeft = Math.min(edge(55), edge(145));
    const expectedRight = Math.max(edge(55), edge(145));
    expect(batch.rects[0]).toBeCloseTo(expectedLeft, 4);
    expect(batch.rects[0]! + batch.rects[2]!).toBeCloseTo(expectedRight, 4);
    expect(batch.rects[2]).not.toBeCloseTo(batch.rects[6]!, 4);
  });

  it("projects both continuous errorbar cap endpoints", () => {
    const model = runPipeline(
      gg(
        {
          x: [100, 200, 400],
          lo: [1, 2, 3],
          hi: [2, 3, 4],
        },
        aes({ x: "x", ymin: "lo", ymax: "hi" }),
      )
        .geomErrorbar()
        .scales({ x: { type: "linear", domain: [50, 450], expand: { mult: 0, add: 0 } } })
        .coordTransform({ x: { transform: "log10", expand: false } })
        .spec(),
      size,
    );
    const batch = model.scene.batches.find((candidate) => candidate.kind === "segments");
    const scale = model.scales.x;
    if (batch?.kind !== "segments" || scale.type === "band")
      throw new Error("expected continuous errorbars");
    const panel = model.scene.panels[0]!;
    const projector = model.coordProjectors[0]!.x;
    const edge = (value: number) =>
      projector.projectFraction(scale.normalizeTransformed(value)) * panel.width;
    expect(batch.segments[4]).toBeCloseTo(edge(55), 4);
    expect(batch.segments[6]).toBeCloseTo(edge(145), 4);
  });

  it("keeps projected rects finite and honors clip: false in SVG", () => {
    const model = runPipeline(
      gg(
        [
          { x: 10, y: 10 },
          { x: 100, y: 20 },
        ],
        aes({ x: "x" }),
      )
        .geomHistogram({ binwidth: 20, boundary: 1 })
        .coordTransform({ x: "log10", clip: false })
        .spec(),
      size,
    );
    const rects = model.scene.batches.find((batch) => batch.kind === "rects");
    if (rects?.kind !== "rects") throw new Error("expected rects");
    expect([...rects.rects].every((value) => Number.isFinite(value))).toBe(true);
    expect(model.scene.panels[0]?.clip).toBe(false);
    expect(sceneToSVGString(model.scene)).not.toContain('class="gg-marks" clip-path=');
  });

  it("tessellates closed area topology without promoting synthetic vertices", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 10, y: 4 },
          { x: 100, y: 9 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomArea()
        .coordTransform({ x: "log10", y: "sqrt" })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.closed).toBe(true);
    expect(batch.positions.length / 2).toBeGreaterThan(6);
    expect([...(batch.semanticAnchors ?? [])].filter((anchor) => anchor === 1)).toHaveLength(6);
    expect(model.candidates.size).toBe(6);
  });

  it("expands step corners before projection and keeps only authored anchors inspectable", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 10, y: 5 },
          { x: 100, y: 20 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomLine({ curve: "step" })
        .coordTransform({ x: "log10", y: "sqrt" })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.curve).toBe("linear");
    expect(batch.positions.length / 2).toBeGreaterThan(3);
    expect(model.candidates.size).toBe(3);
  });

  it("caps render topology without truncating semantic anchors", () => {
    const n = 8_000;
    const rows = Array.from({ length: n }, (_, index) => ({
      x: index % 2 === 0 ? 1 : 1_000_000_000,
      y: index % 2 === 0 ? 1 : 100_000_000,
      group: `segment-${index >>> 1}`,
    }));
    const model = runPipeline(
      gg(rows, aes({ x: "x", y: "y", group: "group" }))
        .geomLine()
        .coordTransform({ x: "log10", y: "sqrt" })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.positions.length / 2).toBeLessThanOrEqual(65_536);
    expect(model.candidates.size).toBe(n);
    expect(model.warnings.some((warning) => warning.code === "coord-tessellation-cap")).toBe(true);
  });

  it("drops filled subpaths whose closed boundary crosses an invalid coordinate domain", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: -1 },
          { x: 2, y: 10 },
          { x: 3, y: 100 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomArea()
        .coordTransform({ y: { transform: "log10", limits: [1, 100], expand: false } })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.positions).toHaveLength(0);
    expect(batch.pathOffsets).toEqual(Uint32Array.from([0]));
    expect(model.candidates.size).toBe(0);
    expect(model.warnings.some((warning) => warning.code === "coord-invalid-geometry")).toBe(true);
  });

  it("splits paths at values outside the coordinate transform domain", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: -1 },
          { x: 4, y: 10 },
          { x: 5, y: 100 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomLine()
        .coordTransform({ y: { transform: "log10", limits: [1, 100], expand: false } })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.pathOffsets).toHaveLength(3);
    expect(
      [0, 1].map(
        (subpath) =>
          [...(batch.semanticAnchors ?? [])]
            .slice(batch.pathOffsets[subpath], batch.pathOffsets[subpath + 1])
            .filter((anchor) => anchor === 1).length,
      ),
    ).toEqual([2, 2]);
    expect([...batch.positions].every((value) => Number.isFinite(value))).toBe(true);
    expect(model.candidates.size).toBe(4);
    const anchorIndexes = [...(batch.semanticAnchors ?? [])].flatMap((anchor, index) =>
      anchor === 1 ? [index] : [],
    );
    // Candidate primitive indexes remain renderer-space indexes even though
    // semanticIndex points back into the pre-split/stat topology.
    expect(candidates(model).map((candidate) => candidate.primitiveIndex)).toEqual(anchorIndexes);
    expect(model.warnings.some((warning) => warning.code === "coord-invalid-geometry")).toBe(true);
  });

  it("tessellates nonlinear paths without creating semantic candidates", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1 },
          { x: 100, y: 100 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomLine()
        .coordTransform({ x: "log10", y: "sqrt" })
        .spec(),
      size,
    );
    const batch = path(model);
    expect(batch.positions.length / 2).toBeGreaterThan(2);
    expect(model.candidates.size).toBe(2);
    expect(candidates(model).map((candidate) => candidate.xValue)).toEqual([1, 100]);
    const syntheticCandidates = [...(batch.semanticAnchors ?? [])]
      .map((anchor, index) => ({ anchor, index }))
      .filter(({ anchor }) => anchor === 0);
    const synthetic = syntheticCandidates[Math.floor(syntheticCandidates.length / 2)]?.index ?? -1;
    expect(synthetic).toBeGreaterThanOrEqual(0);
    const panel = model.scene.panels[0]!;
    const hit = model.candidates.hitTest(
      panel.x + batch.positions[synthetic * 2]!,
      panel.y + batch.positions[synthetic * 2 + 1]!,
    );
    expect(hit).not.toBeNull();
    expect([1, 100]).toContain(hit?.xValue);
  });
});
