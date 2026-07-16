/**
 * Errorbar geometry: vertical range plus caps.
 */
import type { ErrorbarParams } from "@ggsvelte/spec";

import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_RULE_LINEWIDTH, removedWarning } from "./geometry-shared.js";
import { emitErrorbarRows } from "./geometry-errorbar-rows.js";
import { makeErrorbarHalfWidth } from "./geometry-errorbar-width.js";

const DEFAULT_ERRORBAR_WIDTH = 0.9;

export function errorbarBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const params = (binding.layer.params ?? {}) as ErrorbarParams;
  const widthParam = params.width ?? DEFAULT_ERRORBAR_WIDTH;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const halfOf = makeErrorbarHalfWidth(frame, fx, widthParam);

  const segments: number[] = [];
  const rowIndex: number[] = [];
  const strokes: string[] = [];
  const removed = emitErrorbarRows({
    frame,
    fx,
    color,
    wantsColors,
    halfOf,
    segments,
    rowIndex,
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
    linewidth: params.linewidth ?? DEFAULT_RULE_LINEWIDTH,
    alpha: params.alpha ?? 1,
  };
  if (wantsColors) batch.strokes = strokes;
  return batch;
}
