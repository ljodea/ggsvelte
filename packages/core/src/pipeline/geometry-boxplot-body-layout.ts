/**
 * Boxplot body pixel layout: centers, hinge rects, whiskers, and median lines.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { LayerFrame, PipelineWarning } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_BAR_WIDTH, removedWarning } from "./geometry-shared.js";
import {
  createBoxplotBodyBuffers,
  pushKeptBoxplotRow,
  pushRemovedBoxplotRow,
} from "./geometry-boxplot-body-layout-collect.js";
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

  const buffers = createBoxplotBodyBuffers();
  const yPx = (v: number) => fx.innerHeight - yScale.normalize(v) * fx.innerHeight;

  for (let row = 0; row < n; row++) {
    const geom = layoutBoxplotBodyRow({ frame, fx, row, widthFrac, yPx });
    if (geom === null) {
      pushRemovedBoxplotRow(buffers);
      continue;
    }
    pushKeptBoxplotRow(buffers, geom, row);
  }
  removedWarning(buffers.removed, binding.index, warnings);
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
