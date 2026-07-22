/**
 * Geometry characterization — errorbar-batch.
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";
import { batchMarkCount } from "../../src/pipeline.ts";
import { makeErrorbarHalfWidth } from "../../src/pipeline/geometry-errorbar-width.ts";
import type { PathsBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../../src/scene.ts";
import type { LayerFrame } from "../../src/pipeline/types.ts";
import type { Frame } from "../../src/pipeline/geometry-shared.ts";

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

describe("packSegmentsBatch", () => {
  it("returns null for empty rowIndex and builds a segments batch otherwise", async () => {
    const { packSegmentsBatch } = await import("../../src/pipeline/geometry-segments-pack.ts");
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
