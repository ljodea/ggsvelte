/**
 * Characterization tests for geometry helpers extracted from the core pipeline.
 * Public/observable contracts only — batch mark counts and coord-flip vertex
 * mapping — so the split can move freely without rewriting these specs.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { gg, aes } from "@ggsvelte/spec";

import { batchMarkCount, runPipeline } from "../src/pipeline.ts";
import { flipBatchInPlace } from "../src/pipeline/geometry.ts";
import { makeErrorbarHalfWidth } from "../src/pipeline/geometry-errorbar-width.ts";
import type { PathsBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../src/scene.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";

const size = { width: 640, height: 400 };

describe("makeErrorbarHalfWidth", () => {
  it("uses half band-step for discrete x", () => {
    const frame = fromPartial<LayerFrame>({ xNumeric: null });
    const fx = fromPartial<Frame>({
      xScale: { type: "band", step: 0.4, normalize: () => 0 },
      yScale: { type: "linear", normalize: (v: number) => v },
      innerWidth: 100,
      innerHeight: 100,
    });
    const halfOf = makeErrorbarHalfWidth(frame, fx, 0.5);
    expect(halfOf(0)).toBeCloseTo(0.1);
  });
});

describe("batchMarkCount", () => {
  it("counts points and glyphs by rowIndex length", () => {
    const points: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(6),
      rowIndex: new Uint32Array([0, 1, 2]),
      size: 2,
      alpha: 1,
      shape: "circle",
      fill: null,
    };
    expect(batchMarkCount(points)).toBe(3);
  });

  it("counts paths by subpath count (pathOffsets length - 1)", () => {
    const paths: PathsBatch = {
      kind: "paths",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array(8),
      rowIndex: new Uint32Array(4),
      pathOffsets: new Uint32Array([0, 2, 4]),
      strokes: [null, null],
      linewidth: 1,
      alpha: 1,
      curve: "linear",
    };
    expect(batchMarkCount(paths)).toBe(2);
  });

  it("counts rects as length/4 and segments as length/4", () => {
    const rects: RectsBatch = {
      kind: "rects",
      layerIndex: 0,
      panelIndex: 0,
      rects: new Float32Array(8), // 2 rects
      rowIndex: new Uint32Array(2),
      fill: null,
      alpha: 1,
    };
    const segments: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: new Float32Array(12), // 3 segments
      rowIndex: new Uint32Array(3),
      stroke: null,
      linewidth: 1,
      alpha: 1,
    };
    expect(batchMarkCount(rects)).toBe(2);
    expect(batchMarkCount(segments)).toBe(3);
  });
});

describe("flipBatchInPlace — coord flip vertex map", () => {
  it("maps points (x,y) -> (W-y, H-x)", () => {
    const batch: PointsBatch = {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: new Float32Array([10, 20, 30, 40]),
      rowIndex: new Uint32Array([0, 1]),
      size: 2,
      alpha: 1,
      shape: "circle",
      fill: null,
    };
    flipBatchInPlace(batch, 100, 200);
    expect([...batch.positions]).toEqual([100 - 20, 200 - 10, 100 - 40, 200 - 30]);
  });

  it("swaps rect origin/size through the same orientation transform", () => {
    const batch: RectsBatch = {
      kind: "rects",
      layerIndex: 0,
      panelIndex: 0,
      // x=10, y=20, w=30, h=40
      rects: new Float32Array([10, 20, 30, 40]),
      rowIndex: new Uint32Array([0]),
      fill: null,
      alpha: 1,
    };
    flipBatchInPlace(batch, 100, 200);
    // x' = W - (y+h) = 100 - 60 = 40; y' = H - (x+w) = 200 - 40 = 160; w'=h=40; h'=w=30
    expect([...batch.rects]).toEqual([40, 160, 40, 30]);
  });
});

describe("geometry via runPipeline (regression anchors)", () => {
  it("point layer: one points batch with N marks", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
          { x: 3, y: 6 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    expect(batch.kind).toBe("points");
    expect(batchMarkCount(batch)).toBe(3);
  });

  it("line layer: one paths batch with one subpath for ungrouped data", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
          { x: 3, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomLine()
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    expect(batchMarkCount(batch)).toBe(1);
  });

  it("coord flip keeps mark count and remaps point into panel bounds", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .coord({ type: "flip" })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    const panel = model.scene.panels[0]!;
    expect(batchMarkCount(batch)).toBe(2);
    for (let j = 0; j < 2; j++) {
      expect(batch.positions[j * 2]!).toBeGreaterThanOrEqual(0);
      expect(batch.positions[j * 2]!).toBeLessThanOrEqual(panel.width);
      expect(batch.positions[j * 2 + 1]!).toBeGreaterThanOrEqual(0);
      expect(batch.positions[j * 2 + 1]!).toBeLessThanOrEqual(panel.height);
    }
  });
});

describe("buildBatch dispatch via runPipeline", () => {
  it("point → points batch; line → paths; col → rects", () => {
    const point = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    expect(point.scene.batches[0]!.kind).toBe("points");

    const line = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomLine()
        .spec(),
      size,
    );
    expect(line.scene.batches[0]!.kind).toBe("paths");

    const col = runPipeline(
      gg(
        [
          { g: "a", y: 1 },
          { g: "b", y: 2 },
        ],
        aes({ x: "g", y: "y" }),
      )
        .geomCol()
        .spec(),
      size,
    );
    expect(col.scene.batches.some((b) => b.kind === "rects")).toBe(true);
  });

  it("smooth with se ribbon emits closed ribbon path under the line", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
          { x: 3, y: 5 },
          { x: 4, y: 7 },
          { x: 5, y: 8 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomSmooth({ se: true, method: "lm" })
        .spec(),
      size,
    );
    const paths = model.scene.batches.filter((b) => b.kind === "paths");
    expect(paths.length).toBeGreaterThanOrEqual(2);
    const closed = paths.filter((b) => b.kind === "paths" && b.closed === true);
    expect(closed.length).toBeGreaterThanOrEqual(1);
    const line = paths.find((b) => b.kind === "paths" && b.closed !== true);
    expect(line).toBeTruthy();
  });

  it("area emits a closed filled path batch", () => {
    const area = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
          { x: 3, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomArea()
        .spec(),
      size,
    );
    const paths = area.scene.batches.find((b) => b.kind === "paths");
    expect(paths).toBeTruthy();
    if (paths?.kind === "paths") {
      expect(paths.closed).toBe(true);
      expect(paths.fills).toBeTruthy();
      // closed polygon: upper edge + lower edge = 2 * N vertices
      expect(paths.positions.length).toBe(3 * 2 * 2);
    }
  });

  it("text emits glyphs with label texts; annotation rule emits segments", () => {
    const text = runPipeline(
      gg(
        [
          { x: 1, y: 2, label: "a" },
          { x: 2, y: 3, label: "b" },
        ],
        aes({ x: "x", y: "y", label: "label" }),
      )
        .geomText()
        .spec(),
      size,
    );
    const glyphs = text.scene.batches.find((b) => b.kind === "glyphs");
    expect(glyphs).toBeTruthy();
    if (glyphs?.kind === "glyphs") {
      expect(glyphs.texts).toEqual(["a", "b"]);
      expect(batchMarkCount(glyphs)).toBe(2);
    }

    const rule = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomRule({ yintercept: 2.5 })
        .spec(),
      size,
    );
    expect(rule.scene.batches.some((b) => b.kind === "segments")).toBe(true);
    expect(batchMarkCount(rule.scene.batches.find((b) => b.kind === "segments")!)).toBeGreaterThan(
      0,
    );
  });

  it("boxplot emits composite rects + segments; errorbar emits segments", () => {
    const box = runPipeline(
      gg(
        [
          { g: "a", y: 1 },
          { g: "a", y: 2 },
          { g: "a", y: 3 },
          { g: "a", y: 10 },
        ],
        aes({ x: "g", y: "y" }),
      )
        .geomBoxplot()
        .spec(),
      size,
    );
    const kinds = new Set(box.scene.batches.map((b) => b.kind));
    expect(kinds.has("rects")).toBe(true);
    expect(kinds.has("segments")).toBe(true);
    // whiskers + median = two segment batches; outlier points when present
    expect(box.scene.batches.filter((b) => b.kind === "segments").length).toBeGreaterThanOrEqual(2);
    expect(box.scene.batches.some((b) => b.kind === "points")).toBe(true);

    const err = runPipeline(
      gg(
        [
          { x: "a", ymin: 1, ymax: 3 },
          { x: "b", ymin: 2, ymax: 5 },
        ],
        aes({ x: "x", ymin: "ymin", ymax: "ymax" }),
      )
        .geomErrorbar()
        .spec(),
      size,
    );
    expect(err.scene.batches.every((b) => b.kind === "segments")).toBe(true);
  });
});

describe("appendClosedBandEdges — shared closed ribbon vertices", () => {
  it("writes upper edge ascending then lower edge descending", async () => {
    const { appendClosedBandEdges } = await import("../src/pipeline/geometry-paths-closed.ts");
    const positions = new Float32Array(16);
    const rowIndex = new Uint32Array(8);
    const frame = fromAny<LayerFrame>({
      xNumeric: new Float64Array([0, 1]),
      xValues: null,
      rowIndex: new Uint32Array([10, 11]),
      ymin: new Float64Array([0.2, 0.3]),
      ymax: new Float64Array([0.8, 0.9]),
    });
    const fx = fromPartial<Frame>({
      innerWidth: 100,
      innerHeight: 200,
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
    });
    const cursor = appendClosedBandEdges({
      positions,
      rowIndex,
      cursor: 0,
      rows: [0, 1],
      frame,
      fx,
      yTop: frame.ymax!,
      yBottom: frame.ymin!,
    });
    expect(cursor).toBe(4);
    // upper: row0 (0, 0.8) -> px (0, 200-160)=(0,40); row1 (1,0.9)->(100,20)
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(40);
    expect(positions[2]).toBeCloseTo(100);
    expect(positions[3]).toBeCloseTo(20);
    // lower reverse: row1 (1,0.3)->(100,140); row0 (0,0.2)->(0,160)
    expect(positions[4]).toBeCloseTo(100);
    expect(positions[5]).toBeCloseTo(140);
    expect(positions[6]).toBeCloseTo(0);
    expect(positions[7]).toBeCloseTo(160);
    expect([...rowIndex.subarray(0, 4)]).toEqual([10, 11, 11, 10]);
  });
});

describe("layoutBoxplotBody — hinge/whisker collection", () => {
  it("returns null when box extras or scales are unsuitable", async () => {
    const { layoutBoxplotBody } = await import("../src/pipeline/geometry-boxplot-body-layout.ts");
    const frame = fromAny<LayerFrame>({
      binding: { index: 0, layer: { params: {} } },
      n: 1,
      box: null,
      ymin: null,
      ymax: null,
    });
    const fx = fromPartial<Frame>({
      xScale: { type: "linear" },
      yScale: { type: "linear" },
      innerWidth: 100,
      innerHeight: 100,
    });
    expect(layoutBoxplotBody(frame, fx, [])).toBeNull();
  });
});

describe("buildRenderModelScaleState", () => {
  it("includes only non-null color/fill state entries", async () => {
    const { buildRenderModelScaleState } =
      await import("../src/pipeline/assemble-render-model-scales.ts");
    const colorState = fromAny({ domain: ["a"], assigned: { a: 0 } });
    expect(buildRenderModelScaleState(colorState, null)).toEqual({ color: colorState });
    expect(buildRenderModelScaleState(null, null)).toEqual({});
  });
});

describe("resolveSequentialDomain", () => {
  it("parses two-element domains and ignores incomplete ones", async () => {
    const { resolveSequentialDomain } =
      await import("../src/pipeline/scale-color-sequential-domain.ts");
    expect(resolveSequentialDomain()).toBeUndefined();
    expect(resolveSequentialDomain({ domain: [1] })).toBeUndefined();
    expect(resolveSequentialDomain({ domain: [0, 10] })).toEqual([0, 10]);
  });
});

describe("BOX_MEDIAN_FATTEN", () => {
  it("matches ggplot2 fatten default of 2", async () => {
    const { BOX_MEDIAN_FATTEN } =
      await import("../src/pipeline/geometry-boxplot-body-batches-parts.ts");
    expect(BOX_MEDIAN_FATTEN).toBe(2);
  });
});

describe("collectPointPositions", () => {
  it("drops NaN positions and keeps finite points", async () => {
    const { collectPointPositions } = await import("../src/pipeline/geometry-points-collect.ts");
    const frame = fromAny({
      n: 3,
      xNumeric: new Float64Array([0, NaN, 1]),
      yNumeric: new Float64Array([0.5, 0.5, 0.25]),
      xValues: null,
      offsetX: null,
      offsetY: null,
      rowIndex: new Uint32Array([0, 1, 2]),
    });
    const fx = fromAny({
      innerWidth: 100,
      innerHeight: 200,
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
    });
    const collected = collectPointPositions(frame, fx);
    expect(collected.kept).toBe(2);
    expect([...collected.keptRows.subarray(0, 2)]).toEqual([0, 2]);
  });
});

describe("placeSceneLegends", () => {
  it("offsets legend x by scene width minus block width and edge pad", async () => {
    const { placeSceneLegends } = await import("../src/pipeline/assemble-scene-legends.ts");
    const { LEGEND_EDGE_PAD } = await import("../src/pipeline/layout-helpers.ts");
    const legends = placeSceneLegends({
      legends: [fromAny({ x: 0, y: 5, width: 10, height: 10, title: "", items: [] })],
      legendWidth: 40,
      sceneWidth: 200,
      panelY: 12,
    });
    expect(legends[0]!.x).toBe(200 - 40 - LEGEND_EDGE_PAD);
    expect(legends[0]!.y).toBe(5 + 12);
  });
});

describe("flipDisplayTitles / flipDisplayFreeFlags", () => {
  it("swaps titles and free flags under coord flip", async () => {
    const { flipDisplayTitles, flipDisplayFreeFlags } =
      await import("../src/pipeline/panel-layout-chrome-display-flip.ts");
    expect(flipDisplayTitles(true, "X", "Y")).toEqual({ hTitle: "Y", vTitle: "X" });
    expect(flipDisplayTitles(false, "X", "Y")).toEqual({ hTitle: "X", vTitle: "Y" });
    expect(flipDisplayFreeFlags(true, true, false)).toEqual({ freeH: false, freeV: true });
  });
});

describe("computeFacetPanelSize", () => {
  it("divides remaining grid width across columns", async () => {
    const { computeFacetPanelSize } =
      await import("../src/pipeline/panel-layout-facet-cells-size.ts");
    const panels = computeFacetPanelSize({
      nrow: 1,
      ncol: 2,
      freeH: false,
      freeV: false,
      mMax: { top: 0, right: 0, bottom: 0, left: 10 },
      spacing: 0,
      strip: 0,
      gridW: 210,
      gridH: 100,
    });
    // leftCount=1 so left margin once: (210 - 10) / 2 = 100
    expect(panels.panelW).toBe(100);
    expect(panels.panelH).toBe(100);
  });
});

describe("geometryPanelFrame", () => {
  it("swaps extents under coord flip", async () => {
    const { geometryPanelFrame } = await import("../src/pipeline/assemble-geometry-panel-frame.ts");
    const placement = {
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      ticksH: [],
      ticksV: [],
      showAxisX: true,
      showAxisY: true,
    };
    const xScale = {
      type: "linear" as const,
      domain: [0, 1] as [number, number],
      range: [0, 1] as [number, number],
      normalize: (v: number) => v,
    };
    const yScale = {
      type: "linear" as const,
      domain: [0, 1] as [number, number],
      range: [0, 1] as [number, number],
      normalize: (v: number) => v,
    };
    const flipped = geometryPanelFrame(placement, { x: xScale, y: yScale }, true);
    expect(flipped.innerWidth).toBe(40);
    expect(flipped.innerHeight).toBe(80);
    expect(flipped.xScale).toBe(xScale);
  });
});

describe("packSegmentsBatch", () => {
  it("returns null for empty rowIndex and builds a segments batch otherwise", async () => {
    const { packSegmentsBatch } = await import("../src/pipeline/geometry-segments-pack.ts");
    const frame = fromAny({
      binding: {
        index: 0,
        color: { constant: "#111" },
        layer: { params: {} },
        ruleForm: "vertical",
      },
    });
    expect(
      packSegmentsBatch({
        frame,
        segments: [],
        rowIndex: [],
        perSegmentColors: [],
        wantsColors: false,
      }),
    ).toBeNull();
    const batch = packSegmentsBatch({
      frame,
      segments: [0, 0, 10, 10],
      rowIndex: [3],
      perSegmentColors: [],
      wantsColors: false,
    });
    expect(batch?.kind).toBe("segments");
    expect([...batch!.rowIndex]).toEqual([3]);
    expect(batch!.stroke).toBe("#111");
  });
});

describe("packFacetPanelPlacement", () => {
  it("shows y-axis only for column 0 when freeV is false", async () => {
    const { packFacetPanelPlacement } =
      await import("../src/pipeline/panel-layout-facet-place-pack.ts");
    const placement = packFacetPanelPlacement({
      def: fromAny({ col: 1, row: 0 }),
      colX: 20,
      rowY: 10,
      panelW: 100,
      panelH: 50,
      freeH: false,
      freeV: false,
      bottomMostRow: 0,
      ticksRun: fromAny({ x: { ticks: [1] }, y: { ticks: [2] } }),
    });
    expect(placement.showAxisX).toBe(true);
    expect(placement.showAxisY).toBe(false);
    expect(placement.x).toBe(20);
  });
});

describe("writeSmoothLineGeometry", () => {
  it("writes one path offset per group and maps y into panel px", async () => {
    const { writeSmoothLineGeometry } =
      await import("../src/pipeline/geometry-smooth-line-write.ts");
    const frame = fromAny({
      binding: { color: { constant: "#abc", scaledConstant: null } },
      xNumeric: new Float64Array([0, 1]),
      yNumeric: new Float64Array([0, 1]),
      xValues: null,
      colorValues: null,
      rowIndex: new Uint32Array([10, 11]),
    });
    const fx = fromAny({
      xScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      yScale: {
        type: "linear",
        normalize: (v: number) => v,
        normalizeTransformed: (v: number) => v,
      },
      innerWidth: 100,
      innerHeight: 50,
    });
    const geom = writeSmoothLineGeometry({
      frame,
      fx,
      color: null,
      groupRows: [[0, 1]],
    });
    expect([...geom.pathOffsets]).toEqual([0, 2]);
    expect([...geom.rowIndex]).toEqual([10, 11]);
    expect(geom.positions[0]).toBe(0);
    expect(geom.positions[1]).toBe(50);
    expect(geom.positions[2]).toBe(100);
    expect(geom.positions[3]).toBe(0);
    expect(geom.strokes).toEqual(["#abc"]);
  });
});

describe("areaGroupFillOf", () => {
  it("uses the constant fill when no scaled fill is mapped", async () => {
    const { areaGroupFillOf } = await import("../src/pipeline/geometry-paths-area-fill.ts");
    const frame = fromAny({
      binding: { fill: { constant: "#cde", scaledConstant: null } },
      fillValues: null,
    });
    expect(areaGroupFillOf(frame, null, [0])).toBe("#cde");
  });
});
