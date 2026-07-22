/**
 * Pack mutable segment buffers into a SegmentsBatch.
 */
import type { SegmentsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import type { LayerFrame } from "./types.js";
import { DEFAULT_RULE_LINEWIDTH } from "./geometry-shared.js";

export function packSegmentsBatch(input: {
  frame: LayerFrame;
  segments: number[];
  rowIndex: number[];
  styleRows: number[];
  perSegmentColors: string[];
  wantsColors: boolean;
  styles: ResolvedStyleScales;
}): SegmentsBatch | null {
  const { frame, segments, rowIndex, perSegmentColors, wantsColors } = input;
  const styleRows = input.styleRows ?? rowIndex;
  const styles = input.styles ?? {};
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
    linewidth:
      typeof binding.linewidth?.constant === "number"
        ? binding.linewidth.constant
        : (params.linewidth ?? DEFAULT_RULE_LINEWIDTH),
    alpha:
      typeof binding.alpha?.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
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
  if (wantsColors && binding.ruleForm !== "annotation") batch.strokes = perSegmentColors;
  return batch;
}
