/**
 * Bar/col (and binned histogram) rect geometry batch builder.
 */
import type { RectsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";

export function rectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): RectsBatch | null {
  const { binding, n } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const binned = frame.xmin !== null && frame.xmax !== null;
  if (!binned && fx.xScale.type !== "band") return null;
  const params = (binding.layer.params ?? {}) as { width?: number; alpha?: number };
  const widthFrac =
    fx.xScale.type === "band" ? (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step : 0;

  const rects: number[] = [];
  const rowIndexKept: number[] = [];
  const keptRows: number[] = [];
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const t0 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymin[row]!);
    const t1 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymax[row]!);
    let center: number;
    let w: number;
    if (binned) {
      // Bin rects span [xmin, xmax] on a continuous x (histograms).
      if (fx.xScale.type === "band") {
        removed++;
        continue;
      }
      const tx0 = fx.xScale.normalize(frame.xmin![row]!);
      const tx1 = fx.xScale.normalize(frame.xmax![row]!);
      if (Number.isNaN(tx0) || Number.isNaN(tx1) || Number.isNaN(t0) || Number.isNaN(t1)) {
        removed++;
        continue;
      }
      center = (tx0 + tx1) / 2;
      w = Math.abs(tx1 - tx0);
    } else {
      const tc =
        fx.xScale.type === "band" ? fx.xScale.normalize(frame.xValues?.[row] ?? null) : NaN;
      if (tc === undefined || Number.isNaN(tc) || Number.isNaN(t0) || Number.isNaN(t1)) {
        removed++;
        continue;
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
    const xPx = (center - w / 2) * fx.innerWidth;
    const wPx = w * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    rects.push(xPx, Math.min(y0, y1), wPx, Math.abs(y1 - y0));
    rowIndexKept.push(frame.rowIndex[row]!);
    keptRows.push(row);
  }
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return null;

  const batch: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(rects),
    rowIndex: Uint32Array.from(rowIndexKept),
    fill: binding.fill.constant,
    alpha: params.alpha ?? 1,
  };
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    batch.fills = keptRows.map((row) =>
      colorOf(
        fill,
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!,
      ),
    );
  }
  return batch;
}
