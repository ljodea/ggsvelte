/**
 * Resolve bar/col rect center/width and y-bounds in normalized [0,1] space.
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";

export function resolveRectSlot(input: {
  frame: LayerFrame;
  fx: Frame;
  row: number;
  binned: boolean;
  widthFrac: number;
}): { center: number; w: number; t0: number; t1: number } | null {
  const { frame, fx, row, binned, widthFrac } = input;
  const t0 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymin![row]!);
  const t1 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymax![row]!);

  let center: number;
  let w: number;
  if (binned) {
    // Bin rects span [xmin, xmax] on a continuous x (histograms).
    if (fx.xScale.type === "band") return null;
    const tx0 = fx.xScale.normalize(frame.xmin![row]!);
    const tx1 = fx.xScale.normalize(frame.xmax![row]!);
    if (Number.isNaN(tx0) || Number.isNaN(tx1) || Number.isNaN(t0) || Number.isNaN(t1)) {
      return null;
    }
    center = (tx0 + tx1) / 2;
    w = Math.abs(tx1 - tx0);
  } else {
    const tc = fx.xScale.type === "band" ? fx.xScale.normalize(frame.xValues?.[row] ?? null) : NaN;
    if (tc === undefined || Number.isNaN(tc) || Number.isNaN(t0) || Number.isNaN(t1)) {
      return null;
    }
    center = tc;
    w = widthFrac;
  }
  if (frame.dodgeSlot !== null && frame.dodgeSlotCounts !== null) {
    const slotCount = Math.max(1, frame.dodgeSlotCounts[row]!);
    const full = w;
    w = full / slotCount;
    center = center + full * ((frame.dodgeSlot[row]! + 0.5) / slotCount - 0.5);
  }
  return { center, w, t0, t1 };
}
