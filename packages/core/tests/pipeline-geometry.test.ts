/**
 * Characterization tests for geometry helpers extracted from the core pipeline.
 * Public/observable contracts only — batch mark counts and coord-flip vertex
 * mapping — so the split can move freely without rewriting these specs.
 */
import { describe, expect, it } from "bun:test";

import { gg, aes } from "@ggsvelte/spec";

import { batchMarkCount, runPipeline } from "../src/pipeline.ts";
import { flipBatchInPlace } from "../src/pipeline/geometry.ts";
import type { PathsBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../src/scene.ts";

const size = { width: 640, height: 400 };

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
