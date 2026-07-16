/**
 * Boxplot box body: hinge rects, whisker segments, and fattened median.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { batchesFromBoxplotBodyLayout } from "./geometry-boxplot-body-batches.js";
import { layoutBoxplotBody } from "./geometry-boxplot-body-layout.js";

export interface BoxplotBodyResult {
  batches: GeometryBatch[];
  /** Panel-local x centers per box row (NaN when the row was dropped). */
  centerPx: number[];
  linewidth: number;
  alpha: number;
  params: BoxplotParams;
}

export function buildBoxplotBody(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): BoxplotBodyResult | null {
  const layout = layoutBoxplotBody(frame, fx, warnings);
  if (layout === null) return null;
  return batchesFromBoxplotBodyLayout(frame, layout, fill);
}
