/**
 * Per-row boxplot body pixel geometry (center, hinges, whiskers, median).
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";

export interface BoxplotRowGeometry {
  centerPx: number;
  halfPx: number;
  rect: readonly [number, number, number, number];
  whiskers: readonly [number, number, number, number, number, number, number, number];
  median: readonly [number, number, number, number];
  sourceRow: number;
}

export function layoutBoxplotBodyRow(input: {
  frame: LayerFrame;
  fx: Frame;
  row: number;
  widthFrac: number;
  yPx: (v: number) => number;
}): BoxplotRowGeometry | null {
  const { frame, fx, row, widthFrac, yPx } = input;
  const box = frame.box!;
  if (fx.xScale.type !== "band") return null;
  const tc = fx.xScale.normalize(frame.xValues?.[row] ?? null);
  const lo = frame.ymin![row]!;
  const q1 = box.lower[row]!;
  const q2 = box.middle[row]!;
  const q3 = box.upper[row]!;
  const hi = frame.ymax![row]!;
  const yLo = yPx(lo);
  const yQ1 = yPx(q1);
  const yQ2 = yPx(q2);
  const yQ3 = yPx(q3);
  const yHi = yPx(hi);
  if (tc === undefined || ![yLo, yQ1, yQ2, yQ3, yHi].every((v) => Number.isFinite(v))) {
    return null;
  }
  let center = tc;
  let w = widthFrac;
  if (frame.dodge !== null) {
    const slotCount = Math.max(1, frame.dodge.slotCounts[row]!);
    w = widthFrac / slotCount;
    center = tc + widthFrac * ((frame.dodge.slot[row]! + 0.5) / slotCount - 0.5);
  }
  const cx = center * fx.innerWidth;
  const half = (w / 2) * fx.innerWidth;
  return {
    centerPx: cx,
    halfPx: half,
    rect: [cx - half, Math.min(yQ3, yQ1), half * 2, Math.abs(yQ1 - yQ3)],
    whiskers: [cx, yQ3, cx, yHi, cx, yQ1, cx, yLo],
    median: [cx - half, yQ2, cx + half, yQ2],
    sourceRow: frame.rowIndex[row]!,
  };
}
