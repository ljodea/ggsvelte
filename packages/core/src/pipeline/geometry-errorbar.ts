/**
 * Errorbar geometry: vertical range plus caps.
 */
import type { ErrorbarParams } from "@ggsvelte/spec";

import type { SegmentsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { DEFAULT_RULE_LINEWIDTH, removedWarning } from "./geometry-shared.js";
import { emitErrorbarRows } from "./geometry-errorbar-rows.js";
import { makeErrorbarXSpan } from "./geometry-errorbar-width.js";

const DEFAULT_ERRORBAR_WIDTH = 0.9;

export function errorbarBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const params = (binding.layer.params ?? {}) as ErrorbarParams;
  const widthParam = params.width ?? DEFAULT_ERRORBAR_WIDTH;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const xSpanOf = makeErrorbarXSpan(frame, fx, widthParam);

  const segments: number[] = [];
  const rowIndex: number[] = [];
  const styleRows: number[] = [];
  const strokes: string[] = [];
  const removed = emitErrorbarRows({
    frame,
    fx,
    color,
    wantsColors,
    xSpanOf,
    segments,
    rowIndex,
    styleRows,
    strokes,
  });
  removedWarning(removed, binding.index, warnings);
  if (rowIndex.length === 0) return null;

  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments: Float32Array.from(segments),
    rowIndex: Uint32Array.from(rowIndex),
    stroke: binding.color.constant,
    linewidth:
      typeof binding.linewidth.constant === "number"
        ? binding.linewidth.constant
        : (params.linewidth ?? DEFAULT_RULE_LINEWIDTH),
    alpha:
      typeof binding.alpha.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
    ...(typeof binding.linetype.constant === "string" && {
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
  if (wantsColors) batch.strokes = strokes;
  return batch;
}
