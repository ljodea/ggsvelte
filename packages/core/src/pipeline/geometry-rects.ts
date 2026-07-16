/**
 * Bar/col (and binned histogram) rect geometry batch builder.
 */
import type { RectsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";
import { resolveRectSlot } from "./geometry-rects-slot.js";

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
