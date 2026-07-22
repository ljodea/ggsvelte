/**
 * Push vertical/horizontal rule segments into preallocated typed buffers.
 *
 * Capacity is sized once by the caller (data: frame.n; annotation: intercept
 * count). Dense keep reuses buffers; sparse compact is handled after emit.
 */
import type { Frame } from "./geometry-shared.js";

export interface SegmentEmitBuffers {
  segments: Float32Array;
  rowIndex: Uint32Array;
  kept: number;
  removed: number;
}

export function createSegmentEmitters(input: { fx: Frame; buffers: SegmentEmitBuffers }): {
  pushVertical: (t: number | undefined, row: number) => void;
  pushHorizontal: (t: number | undefined, row: number) => void;
} {
  const { fx, buffers } = input;
  return {
    pushVertical(t, row) {
      if (t === undefined || Number.isNaN(t)) {
        buffers.removed++;
        return;
      }
      const x = t * fx.innerWidth;
      const o = buffers.kept * 4;
      buffers.segments[o] = x;
      buffers.segments[o + 1] = 0;
      buffers.segments[o + 2] = x;
      buffers.segments[o + 3] = fx.innerHeight;
      buffers.rowIndex[buffers.kept] = row;
      buffers.kept++;
    },
    pushHorizontal(t, row) {
      if (t === undefined || Number.isNaN(t)) {
        buffers.removed++;
        return;
      }
      const y = fx.innerHeight - t * fx.innerHeight;
      const o = buffers.kept * 4;
      buffers.segments[o] = 0;
      buffers.segments[o + 1] = y;
      buffers.segments[o + 2] = fx.innerWidth;
      buffers.segments[o + 3] = y;
      buffers.rowIndex[buffers.kept] = row;
      buffers.kept++;
    },
  };
}

/** Compact full-capacity scratch to exact kept length (or empty arrays). */
export function compactSegmentBuffers(
  buffers: SegmentEmitBuffers,
  capacity: number,
): { segments: Float32Array; rowIndex: Uint32Array; kept: number; removed: number } {
  const { kept, removed, segments, rowIndex } = buffers;
  if (kept === 0) {
    return {
      segments: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      kept: 0,
      removed,
    };
  }
  if (kept === capacity) {
    return { segments, rowIndex, kept, removed };
  }
  return {
    segments: segments.subarray(0, kept * 4).slice(),
    rowIndex: rowIndex.subarray(0, kept).slice(),
    kept,
    removed,
  };
}
