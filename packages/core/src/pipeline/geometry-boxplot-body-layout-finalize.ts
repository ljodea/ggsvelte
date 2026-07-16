/**
 * Finalize boxplot body buffers into a public layout result.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { BoxplotBodyBuffers } from "./geometry-boxplot-body-layout-collect.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout-types.js";

export function finalizeBoxplotBodyLayout(
  buffers: BoxplotBodyBuffers,
  linewidth: number,
  alpha: number,
  params: BoxplotParams,
): BoxplotBodyLayout | null {
  if (buffers.keptRows.length === 0) return null;
  return {
    centerPx: buffers.centerPx,
    halfPx: buffers.halfPx,
    rects: buffers.rects,
    rectRows: buffers.rectRows,
    keptRows: buffers.keptRows,
    whiskers: buffers.whiskers,
    whiskerRows: buffers.whiskerRows,
    medians: buffers.medians,
    medianRows: buffers.medianRows,
    linewidth,
    alpha,
    params,
  };
}
