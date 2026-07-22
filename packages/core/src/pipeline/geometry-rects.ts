/**
 * Bar/col (and binned histogram) rect geometry batch builder.
 */
import type { RectsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";
import { emitRectRows } from "./geometry-rects-emit.js";

export function rectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): RectsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const binned = (frame.xmin !== null && frame.xmax !== null) || binding.xBinning !== undefined;
  const params = (binding.layer.params ?? {}) as { width?: number; alpha?: number };
  let widthFrac: number;
  if (fx.xScale.type === "band") {
    widthFrac = (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step;
  } else if (binned) {
    // stat-bin carries exact xmin/xmax edges (0 means span the full bin); a
    // binned position scale applies the authored/default width fraction.
    widthFrac = binding.xBinning === undefined ? 0 : (params.width ?? DEFAULT_BAR_WIDTH);
  } else {
    const values = [...(frame.xNumeric ?? [])]
      .filter((value) => Number.isFinite(value))
      .toSorted((a, b) => a - b);
    let resolution = Number.POSITIVE_INFINITY;
    for (let index = 1; index < values.length; index++) {
      const gap = values[index]! - values[index - 1]!;
      if (gap > 0 && gap < resolution) resolution = gap;
    }
    if (!Number.isFinite(resolution)) resolution = 1;
    const span = fx.xScale.transformedDomain[1] - fx.xScale.transformedDomain[0];
    widthFrac = span === 0 ? 0 : ((params.width ?? DEFAULT_BAR_WIDTH) * resolution) / span;
  }

  const { rects, rowIndexKept, keptRows, removed } = emitRectRows({
    frame,
    fx,
    binned,
    widthFrac,
  });
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return null;

  const batch: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(rects),
    rowIndex: Uint32Array.from(rowIndexKept),
    fill: binding.fill.constant,
    alpha:
      typeof binding.alpha.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
  };
  const alphas = numericStyleVector(frame, "alpha", keptRows, styles);
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
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
