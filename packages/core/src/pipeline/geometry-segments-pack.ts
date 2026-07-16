/**
 * Pack mutable segment buffers into a SegmentsBatch.
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import { DEFAULT_RULE_LINEWIDTH } from "./geometry-shared.js";

export function packSegmentsBatch(input: {
  frame: LayerFrame;
  segments: number[];
  rowIndex: number[];
  perSegmentColors: string[];
  wantsColors: boolean;
}): SegmentsBatch | null {
  const { frame, segments, rowIndex, perSegmentColors, wantsColors } = input;
  if (rowIndex.length === 0) return null;
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as { linewidth?: number; alpha?: number };
  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments: Float32Array.from(segments),
    rowIndex: Uint32Array.from(rowIndex),
    stroke: binding.color.constant,
    linewidth: params.linewidth ?? DEFAULT_RULE_LINEWIDTH,
    alpha: params.alpha ?? 1,
  };
  if (wantsColors && binding.ruleForm !== "annotation") batch.strokes = perSegmentColors;
  return batch;
}
