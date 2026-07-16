/**
 * Boxplot body pixel layout: centers, hinge rects, whiskers, and median lines.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { LayerFrame, PipelineWarning } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";
import { layoutBoxplotBodyRow } from "./geometry-boxplot-body-row.js";

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
    const geom = layoutBoxplotBodyRow({ frame, fx, row, widthFrac, yPx });
    if (geom === null) {
      removed++;
      centerPx.push(NaN);
      halfPx.push(NaN);
      continue;
    }
    centerPx.push(geom.centerPx);
    halfPx.push(geom.halfPx);
    rects.push(...geom.rect);
    rectRows.push(geom.sourceRow);
    keptRows.push(row);
    whiskers.push(...geom.whiskers);
    whiskerRows.push(geom.sourceRow, geom.sourceRow);
    medians.push(...geom.median);
    medianRows.push(geom.sourceRow);
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
