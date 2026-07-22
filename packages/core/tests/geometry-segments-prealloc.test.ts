/**
 * Rule segment emit/pack prealloc: typed buffers sized to capacity,
 * dense reuse / sparse compact (like glyphs/rects).
 */
import { fromAny, fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import {
  compactSegmentBuffers,
  createSegmentEmitters,
  type SegmentEmitBuffers,
} from "../src/pipeline/geometry-segments-emit.ts";
import { packSegmentsBatch } from "../src/pipeline/geometry-segments-pack.ts";
import type { Frame } from "../src/pipeline/geometry-shared.ts";
import type { LayerFrame } from "../src/pipeline/types.ts";
import { NO_ROW } from "../src/pipeline/types.ts";

function fx(w = 100, h = 50): Frame {
  return fromPartial<Frame>({
    innerWidth: w,
    innerHeight: h,
    xScale: { type: "linear", normalize: (v: number) => v },
    yScale: { type: "linear", normalize: (v: number) => v },
  });
}

function emptyBuffers(capacity: number): SegmentEmitBuffers {
  return {
    segments: new Float32Array(capacity * 4),
    rowIndex: new Uint32Array(capacity),
    kept: 0,
    removed: 0,
  };
}

describe("createSegmentEmitters prealloc", () => {
  it("writes vertical and horizontal segments into typed slots", () => {
    const buffers = emptyBuffers(2);
    const { pushVertical, pushHorizontal } = createSegmentEmitters({ fx: fx(), buffers });
    pushVertical(0.25, 3);
    pushHorizontal(0.5, 7);
    expect(buffers.kept).toBe(2);
    expect(buffers.removed).toBe(0);
    // vertical at x=25: (25,0)-(25,50)
    expect([...buffers.segments.subarray(0, 4)]).toEqual([25, 0, 25, 50]);
    // horizontal at y=25 (height - 0.5*height): (0,25)-(100,25)
    expect([...buffers.segments.subarray(4, 8)]).toEqual([0, 25, 100, 25]);
    expect([...buffers.rowIndex.subarray(0, 2)]).toEqual([3, 7]);
  });

  it("counts removed for NaN / undefined without writing", () => {
    const buffers = emptyBuffers(2);
    const { pushVertical } = createSegmentEmitters({ fx: fx(), buffers });
    pushVertical(Number.NaN, 1);
    pushVertical(undefined, 2);
    expect(buffers.kept).toBe(0);
    expect(buffers.removed).toBe(2);
  });
});

describe("compactSegmentBuffers", () => {
  it("dense path returns the same typed arrays", () => {
    const buffers = emptyBuffers(1);
    const { pushVertical } = createSegmentEmitters({ fx: fx(), buffers });
    pushVertical(0.1, 0);
    const compact = compactSegmentBuffers(buffers, 1);
    expect(compact.kept).toBe(1);
    expect(compact.segments).toBe(buffers.segments);
    expect(compact.rowIndex).toBe(buffers.rowIndex);
  });

  it("sparse path slices to kept length", () => {
    const buffers = emptyBuffers(3);
    const { pushVertical } = createSegmentEmitters({ fx: fx(), buffers });
    pushVertical(0.1, 1);
    pushVertical(Number.NaN, 2);
    pushVertical(0.9, 3);
    const compact = compactSegmentBuffers(buffers, 3);
    expect(compact.kept).toBe(2);
    expect(compact.removed).toBe(1);
    expect(compact.segments.length).toBe(8);
    expect(compact.rowIndex.length).toBe(2);
    expect([...compact.rowIndex]).toEqual([1, 3]);
    expect(compact.segments).not.toBe(buffers.segments);
  });

  it("empty path returns zero-length typed arrays", () => {
    const compact = compactSegmentBuffers(emptyBuffers(4), 4);
    expect(compact.kept).toBe(0);
    expect(compact.segments.length).toBe(0);
    expect(compact.rowIndex.length).toBe(0);
  });
});

describe("packSegmentsBatch", () => {
  it("builds a SegmentsBatch from pre-compacted typed arrays", () => {
    const frame = fromAny<LayerFrame>({
      binding: {
        index: 2,
        color: { constant: "#abc" },
        ruleForm: "vertical",
        layer: { params: { linewidth: 2, alpha: 0.5 } },
      },
    });
    const segments = Float32Array.of(10, 0, 10, 50);
    const rowIndex = Uint32Array.of(NO_ROW);
    const batch = packSegmentsBatch({
      frame,
      segments,
      rowIndex,
      strokes: null,
      wantsColors: false,
    });
    expect(batch).not.toBeNull();
    expect(batch!.segments).toBe(segments);
    expect(batch!.rowIndex).toBe(rowIndex);
    expect(batch!.linewidth).toBe(2);
    expect(batch!.alpha).toBe(0.5);
    expect(batch!.stroke).toBe("#abc");
  });

  it("returns null when no segments", () => {
    const frame = fromAny<LayerFrame>({
      binding: { index: 0, color: { constant: null }, ruleForm: "vertical", layer: {} },
    });
    expect(
      packSegmentsBatch({
        frame,
        segments: new Float32Array(0),
        rowIndex: new Uint32Array(0),
        strokes: null,
        wantsColors: false,
      }),
    ).toBeNull();
  });
});
