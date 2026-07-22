/**
 * Pack preallocated segment buffers into a SegmentsBatch.
 *
 * Callers pass already-compact typed arrays (dense as-is or sparse-sliced).
 */
import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import { DEFAULT_RULE_LINEWIDTH } from "./geometry-shared.js";

export function packSegmentsBatch(input: {
  frame: LayerFrame;
  segments: Float32Array;
  rowIndex: Uint32Array;
  strokes: string[] | null;
  wantsColors: boolean;
}): SegmentsBatch | null {
  const { frame, segments, rowIndex, strokes, wantsColors } = input;
  if (rowIndex.length === 0) return null;
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as { linewidth?: number; alpha?: number };
  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments,
    rowIndex,
    stroke: binding.color.constant,
    linewidth: params.linewidth ?? DEFAULT_RULE_LINEWIDTH,
    alpha: params.alpha ?? 1,
  };
  if (wantsColors && binding.ruleForm !== "annotation" && strokes !== null) {
    batch.strokes = strokes;
  }
  return batch;
}
