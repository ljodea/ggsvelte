/**
 * Characterization tests for geometry helpers extracted from the core pipeline.
 * Public/observable contracts only — batch mark counts and coord-flip vertex
 * mapping — so the split can move freely without rewriting these specs.
 */
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
    const frame = { xNumeric: null } as LayerFrame;
    const fx = {
      xScale: { type: "band", step: 0.4, normalize: () => 0 },
      yScale: { type: "linear", normalize: (v: number) => v },
      innerWidth: 100,
      innerHeight: 100,
    } as Frame;
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
