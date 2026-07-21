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
  // frame.ymin/ymax/xmin/xmax are already-transformed (scale-space) frame
  // arrays (source-applied or stat-generated); normalizeTransformed skips the
  // forward so they are never transformed twice.
  const t0 = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(frame.ymin![row]!);
  const t1 = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(frame.ymax![row]!);

  let center: number;
  let w: number;
  if (binned) {
    if (fx.xScale.type === "band") return null;
    let tx0: number;
    let tx1: number;
    if (frame.xmin !== null && frame.xmax !== null) {
      // Stat-bin rects already carry transformed [xmin, xmax] edges.
      tx0 = fx.xScale.normalizeTransformed(frame.xmin[row]!);
      tx1 = fx.xScale.normalizeTransformed(frame.xmax[row]!);
    } else {
      // A binned position scale snaps identity-stat rows to a transformed
      // center. Recover that center's reviewed pre-stat boundaries so bars
      // span their bin and dodge within the same shared slot.
      const boundaries = frame.binding.xBinning;
      const transformedCenter = frame.xNumeric?.[row];
      if (boundaries === undefined || transformedCenter === undefined) return null;
      const index = boundaries.centers.findIndex((value) => Object.is(value, transformedCenter));
      if (index < 0) return null;
      tx0 = fx.xScale.normalizeTransformed(boundaries.edges[index]!);
      tx1 = fx.xScale.normalizeTransformed(boundaries.edges[index + 1]!);
    }
    if (Number.isNaN(tx0) || Number.isNaN(tx1) || Number.isNaN(t0) || Number.isNaN(t1)) {
      return null;
    }
    center = (tx0 + tx1) / 2;
    w = Math.abs(tx1 - tx0) * (widthFrac === 0 ? 1 : widthFrac);
  } else {
    const tc =
      fx.xScale.type === "band"
        ? fx.xScale.normalize(frame.xValues?.[row] ?? null)
        : fx.xScale.normalizeTransformed(frame.xNumeric?.[row] ?? Number.NaN);
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
