/**
 * Boxplot whisker and median segment batches from body layout.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout.js";

/** Median line draws at 2× the box linewidth (ggplot2's fatten = 2). */
export const BOX_MEDIAN_FATTEN = 2;

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
