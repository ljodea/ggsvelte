/**
 * Assemble boxplot body GeometryBatches from precomputed pixel layout.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { GeometryBatch, RectsBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout.js";

/** Median line draws at 2× the box linewidth (ggplot2's fatten = 2). */
const BOX_MEDIAN_FATTEN = 2;

export function batchesFromBoxplotBodyLayout(
  frame: LayerFrame,
  layout: BoxplotBodyLayout,
  fill: ResolvedColorScale | null,
): {
  batches: GeometryBatch[];
  centerPx: number[];
  linewidth: number;
  alpha: number;
  params: BoxplotParams;
} {
  const { binding } = frame;
  const { linewidth, alpha, params } = layout;

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

  const batches: GeometryBatch[] = [
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
    rectsBatchOut,
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

  return {
    batches,
    centerPx: layout.centerPx,
    linewidth,
    alpha,
    params,
  };
}
