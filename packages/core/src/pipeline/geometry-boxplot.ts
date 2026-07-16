/**
 * Boxplot composite geometry from rects, segments, and outlier points.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { buildBoxplotBody } from "./geometry-boxplot-body.js";
import { buildBoxplotOutliers } from "./geometry-boxplot-outliers.js";

export function boxplotBatches(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const body = buildBoxplotBody(frame, fx, fill, warnings);
  if (body === null) return [];

  const out: GeometryBatch[] = [...body.batches];
  const outliers = buildBoxplotOutliers({
    frame,
    fx,
    centerPx: body.centerPx,
    alpha: body.alpha,
    params: body.params,
  });
  if (outliers !== null) out.push(outliers);
  return out;
}
