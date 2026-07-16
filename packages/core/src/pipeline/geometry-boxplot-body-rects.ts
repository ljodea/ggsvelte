/**
 * Boxplot hinge rect batch from precomputed body layout.
 */
import type { RectsBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { BoxplotBodyLayout } from "./geometry-boxplot-body-layout.js";

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
