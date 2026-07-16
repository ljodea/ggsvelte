/**
 * Emit bar/col rect pixels from resolved slots.
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
  rects: number[];
  rowIndexKept: number[];
  keptRows: number[];
  removed: number;
} {
  const { frame, fx, binned, widthFrac } = input;
  const { n } = frame;
  const rects: number[] = [];
  const rowIndexKept: number[] = [];
  const keptRows: number[] = [];
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const slot = resolveRectSlot({ frame, fx, row, binned, widthFrac });
    if (slot === null) {
      removed++;
      continue;
    }
    const xPx = (slot.center - slot.w / 2) * fx.innerWidth;
    const wPx = slot.w * fx.innerWidth;
    const y0 = fx.innerHeight - slot.t0 * fx.innerHeight;
    const y1 = fx.innerHeight - slot.t1 * fx.innerHeight;
    rects.push(xPx, Math.min(y0, y1), wPx, Math.abs(y1 - y0));
    rowIndexKept.push(frame.rowIndex[row]!);
    keptRows.push(row);
  }
  return { rects, rowIndexKept, keptRows, removed };
}
