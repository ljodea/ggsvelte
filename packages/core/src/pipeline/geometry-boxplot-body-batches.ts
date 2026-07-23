/**
 * Assemble boxplot body GeometryBatches from precomputed pixel layout.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout.js";
import {
  makeBoxplotRectsBatch,
  makeBoxplotWhiskerAndMedianBatches,
} from "./geometry-boxplot-body-batches-parts.js";

export function batchesFromBoxplotBodyLayout(
  frame: LayerFrame,
  layout: BoxplotBodyLayout,
  fill: ResolvedColorScale | null,
): {
  batches: GeometryBatch[];
  centerPx: number[];
  linewidth: number;
  alpha: number;
  keptRows: number[];
  params: BoxplotParams;
} {
  const { linewidth, alpha, params } = layout;
  const [whiskers, medians] = makeBoxplotWhiskerAndMedianBatches(frame, layout);
  const rects = makeBoxplotRectsBatch(frame, layout, fill);

  return {
    batches: [whiskers!, rects, medians!],
    centerPx: layout.centerPx,
    linewidth,
    alpha,
    keptRows: layout.keptRows,
    params,
  };
}
