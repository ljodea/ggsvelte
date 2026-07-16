/**
 * Boxplot body pixel layout: centers, hinge rects, whiskers, and median lines.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { LayerFrame, PipelineWarning } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";

const DEFAULT_BOX_LINEWIDTH = 1;

export interface BoxplotBodyLayout {
  centerPx: number[];
  halfPx: number[];
  rects: number[];
  rectRows: number[];
  keptRows: number[];
  whiskers: number[];
  whiskerRows: number[];
  medians: number[];
  medianRows: number[];
  linewidth: number;
  alpha: number;
  params: BoxplotParams;
}

export function layoutBoxplotBody(
  frame: LayerFrame,
  fx: Frame,
  warnings: PipelineWarning[],
): BoxplotBodyLayout | null {
  const { binding, n } = frame;
  const box = frame.box;
  if (
    box === null ||
    frame.ymin === null ||
    frame.ymax === null ||
    fx.xScale.type !== "band" ||
    fx.yScale.type === "band"
  ) {
    return null;
  }
  const params = (binding.layer.params ?? {}) as BoxplotParams;
  const widthFrac = (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step;
  const linewidth = params.linewidth ?? DEFAULT_BOX_LINEWIDTH;
  const alpha = params.alpha ?? 1;
  const yScale = fx.yScale;

  const centerPx: number[] = [];
  const halfPx: number[] = [];
  const rects: number[] = [];
  const rectRows: number[] = [];
  const keptRows: number[] = [];
  const whiskers: number[] = [];
  const whiskerRows: number[] = [];
  const medians: number[] = [];
  const medianRows: number[] = [];
  let removed = 0;

  const yPx = (v: number) => fx.innerHeight - yScale.normalize(v) * fx.innerHeight;

  for (let row = 0; row < n; row++) {
    const tc = fx.xScale.normalize(frame.xValues?.[row] ?? null);
    const lo = frame.ymin[row]!;
    const q1 = box.lower[row]!;
    const q2 = box.middle[row]!;
    const q3 = box.upper[row]!;
    const hi = frame.ymax[row]!;
    if (
      tc === undefined ||
      ![lo, q1, q2, q3, hi].every((v) => Number.isFinite(yScale.normalize(v)))
    ) {
      removed++;
      centerPx.push(NaN);
      halfPx.push(NaN);
      continue;
    }
    let center = tc;
    let w = widthFrac;
    if (frame.dodgeSlot !== null && frame.dodgeSlotCounts !== null) {
      const slotCount = Math.max(1, frame.dodgeSlotCounts[row]!);
      w = widthFrac / slotCount;
      center = tc + widthFrac * ((frame.dodgeSlot[row]! + 0.5) / slotCount - 0.5);
    }
    const cx = center * fx.innerWidth;
    const half = (w / 2) * fx.innerWidth;
    centerPx.push(cx);
    halfPx.push(half);
    // Box: lower..upper hinges.
    rects.push(cx - half, Math.min(yPx(q3), yPx(q1)), half * 2, Math.abs(yPx(q1) - yPx(q3)));
    rectRows.push(frame.rowIndex[row]!);
    keptRows.push(row);
    // Whiskers: hinge -> whisker end, both directions.
    whiskers.push(cx, yPx(q3), cx, yPx(hi), cx, yPx(q1), cx, yPx(lo));
    whiskerRows.push(frame.rowIndex[row]!, frame.rowIndex[row]!);
    // Median line across the box.
    medians.push(cx - half, yPx(q2), cx + half, yPx(q2));
    medianRows.push(frame.rowIndex[row]!);
  }
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return null;

  return {
    centerPx,
    halfPx,
    rects,
    rectRows,
    keptRows,
    whiskers,
    whiskerRows,
    medians,
    medianRows,
    linewidth,
    alpha,
    params,
  };
}
