/**
 * Emit bar/col rect pixels from resolved slots.
 *
 * Pre-allocates typed buffers (like geometry-points-collect) so large frames
 * avoid dynamic number[] growth + Float32Array.from double-copy.
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { resolveRectSlot } from "./geometry-rects-slot.js";

export function emitRectRows(input: {
  frame: LayerFrame;
  fx: Frame;
  binned: boolean;
  widthFrac: number;
}): {
  rects: Float32Array;
  rowIndex: Uint32Array;
  keptRows: Uint32Array;
  kept: number;
  removed: number;
} {
  const { frame, fx, binned, widthFrac } = input;
  const { n } = frame;
  const rects = new Float32Array(n * 4);
  const rowIndex = new Uint32Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const slot = resolveRectSlot({ frame, fx, row, binned, widthFrac });
    if (slot === null) {
      removed++;
      continue;
    }
    const o = kept * 4;
    const xPx = (slot.center - slot.w / 2) * fx.innerWidth;
    const wPx = slot.w * fx.innerWidth;
    const y0 = fx.innerHeight - slot.t0 * fx.innerHeight;
    const y1 = fx.innerHeight - slot.t1 * fx.innerHeight;
    rects[o] = xPx;
    rects[o + 1] = Math.min(y0, y1);
    rects[o + 2] = wPx;
    rects[o + 3] = Math.abs(y1 - y0);
    rowIndex[kept] = frame.rowIndex[row]!;
    keptRows[kept] = row;
    kept++;
  }
  // Dense path (common for bar/col): buffers already exact-sized — no copy.
  if (kept === n) return { rects, rowIndex, keptRows, kept, removed };
  if (kept === 0) {
    return {
      rects: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      keptRows: new Uint32Array(0),
      kept: 0,
      removed,
    };
  }
  // Sparse path: compact exported buffers so full-n scratch can be GC'd.
  // keptRows is only used inside rectsBatch; a view is enough.
  return {
    rects: rects.subarray(0, kept * 4).slice(),
    rowIndex: rowIndex.subarray(0, kept).slice(),
    keptRows: keptRows.subarray(0, kept),
    kept,
    removed,
  };
}
