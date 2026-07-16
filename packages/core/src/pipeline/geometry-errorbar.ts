/**
 * Errorbar geometry: vertical range plus caps.
 */
import type { ErrorbarParams } from "@ggsvelte/spec";

import type { SegmentsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_RULE_LINEWIDTH, positionOf, removedWarning } from "./geometry-shared.js";
import { makeErrorbarHalfWidth } from "./geometry-errorbar-width.js";

const DEFAULT_ERRORBAR_WIDTH = 0.9;

export function errorbarBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding, n } = frame;
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const params = (binding.layer.params ?? {}) as ErrorbarParams;
  const widthParam = params.width ?? DEFAULT_ERRORBAR_WIDTH;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const halfOf = makeErrorbarHalfWidth(frame, fx, widthParam);

  const segments: number[] = [];
  const rowIndex: number[] = [];
  const strokes: string[] = [];
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.normalize(frame.ymin[row]!);
    const t1 = fx.yScale.normalize(frame.ymax[row]!);
    if (Number.isNaN(tx) || Number.isNaN(t0) || Number.isNaN(t1)) {
      removed++;
      continue;
    }
    const cx = tx * fx.innerWidth;
    const half = halfOf(row) * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    segments.push(cx, y0, cx, y1, cx - half, y0, cx + half, y0, cx - half, y1, cx + half, y1);
    const src = frame.rowIndex[row]!;
    rowIndex.push(src, src, src);
    if (wantsColors) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      const c = colorOf(color, value);
      strokes.push(c, c, c);
    }
  }
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
