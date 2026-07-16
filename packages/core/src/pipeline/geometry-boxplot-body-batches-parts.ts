/**
 * Boxplot body batch pieces: hinge rects, whiskers, and median segments.
 */
import type { GeometryBatch, RectsBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout.js";

/** Median line draws at 2× the box linewidth (ggplot2's fatten = 2). */
export const BOX_MEDIAN_FATTEN = 2;

export function makeBoxplotRectsBatch(
  frame: LayerFrame,
  layout: BoxplotBodyLayout,
  fill: ResolvedColorScale | null,
): RectsBatch {
  const { binding } = frame;
  const { linewidth, alpha } = layout;
  const rectsBatchOut: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(layout.rects),
    rowIndex: Uint32Array.from(layout.rectRows),
    fill: binding.fill.constant,
    fillRole: "paper",
    stroke: null,
    strokeWidth: linewidth,
    alpha,
  };
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    rectsBatchOut.fills = layout.keptRows.map((row) =>
      colorOf(
        fill,
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!,
      ),
    );
  }
  return rectsBatchOut;
}

export function makeBoxplotWhiskerAndMedianBatches(
  frame: LayerFrame,
  layout: BoxplotBodyLayout,
): GeometryBatch[] {
  const { binding } = frame;
  const { linewidth, alpha } = layout;
  return [
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(layout.whiskers),
      rowIndex: Uint32Array.from(layout.whiskerRows),
      stroke: null,
      linewidth,
      alpha,
    },
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(layout.medians),
      rowIndex: Uint32Array.from(layout.medianRows),
      stroke: null,
      linewidth: linewidth * BOX_MEDIAN_FATTEN,
      alpha,
    },
  ];
}
