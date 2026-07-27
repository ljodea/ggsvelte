/**
 * Pack preallocated segment buffers into a SegmentsBatch.
 *
 * Callers pass already-compact typed arrays (dense as-is or sparse-sliced).
 */
import type { SegmentsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import {
  indexedStyleVector,
  constantStyle,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import type { LayerFrame } from "./types.js";
import { DEFAULT_RULE_LINEWIDTH } from "./geometry-shared.js";

export function packSegmentsBatch(input: {
  frame: LayerFrame;
  segments: Float32Array;
  rowIndex: Uint32Array;
  styleRows?: ArrayLike<number>;
  strokes: string[] | null;
  wantsColors: boolean;
  styles?: ResolvedStyleScales;
}): SegmentsBatch | null {
  const { frame, segments, rowIndex, strokes, wantsColors } = input;
  const styleRows = input.styleRows ?? rowIndex;
  const styles = input.styles ?? ({} as ResolvedStyleScales);
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
    linewidth: constantStyle(binding, params, "linewidth", DEFAULT_RULE_LINEWIDTH),
    alpha: constantStyle(binding, params, "alpha", 1),
    ...(typeof binding.linetype?.constant === "string" && {
      linetype: binding.linetype.constant as Linetype,
    }),
  };
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linetypeIndexes = indexedStyleVector(frame, "linetype", styleRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  if (linewidths !== undefined) batch.linewidths = linewidths;
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (linetypeIndexes !== undefined) batch.linetypeIndexes = linetypeIndexes;
  if (wantsColors && binding.ruleForm !== "annotation" && strokes !== null) {
    batch.strokes = strokes;
  }
  return batch;
}
