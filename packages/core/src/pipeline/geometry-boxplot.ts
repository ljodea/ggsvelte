/**
 * Boxplot composite geometry from rects, segments, and outlier points.
 */
import type { GeometryBatch, RectsBatch, SegmentsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { buildBoxplotBody } from "./geometry-boxplot-body.js";
import { buildBoxplotOutliers } from "./geometry-boxplot-outliers.js";

export function boxplotBatches(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const body = buildBoxplotBody(frame, fx, fill, warnings);
  if (body === null) return [];

  const [whiskers, rects, medians] = body.batches as [SegmentsBatch, RectsBatch, SegmentsBatch];
  const whiskerRows = body.keptRows.flatMap((row) => [row, row]);
  const linewidths = numericStyleVector(frame, "linewidth", body.keptRows, styles);
  const whiskerLinewidths = numericStyleVector(frame, "linewidth", whiskerRows, styles);
  const alphas = numericStyleVector(frame, "alpha", body.keptRows, styles);
  const whiskerAlphas = numericStyleVector(frame, "alpha", whiskerRows, styles);
  const linetypes = indexedStyleVector(frame, "linetype", body.keptRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  const whiskerLinetypes = indexedStyleVector(frame, "linetype", whiskerRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  if (linewidths !== undefined) {
    rects.strokeWidths = linewidths;
    medians.linewidths = Float32Array.from(linewidths, (value) => value * 2);
  }
  if (whiskerLinewidths !== undefined) whiskers.linewidths = whiskerLinewidths;
  if (alphas !== undefined) {
    rects.alpha = 1;
    rects.alphas = alphas;
    medians.alpha = 1;
    medians.alphas = alphas;
  }
  if (whiskerAlphas !== undefined) {
    whiskers.alpha = 1;
    whiskers.alphas = whiskerAlphas;
  }
  if (linetypes !== undefined) medians.linetypeIndexes = linetypes;
  if (whiskerLinetypes !== undefined) whiskers.linetypeIndexes = whiskerLinetypes;

  const out: GeometryBatch[] = [whiskers, rects, medians];
  const outliers = buildBoxplotOutliers({
    frame,
    fx,
    centerPx: body.centerPx,
    alpha: body.alpha,
    params: body.params,
    styles,
  });
  if (outliers !== null) out.push(outliers);
  return out;
}
