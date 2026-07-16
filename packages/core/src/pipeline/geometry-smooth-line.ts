/**
 * Smooth fitted-line path batch.
 */
import type { SmoothParams } from "@ggsvelte/spec";

import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_SMOOTH_LINEWIDTH } from "./geometry-smooth-shared.js";
import { writeSmoothLineGeometry } from "./geometry-smooth-line-write.js";

export function buildSmoothLineBatch(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  groupRows: readonly (readonly number[])[];
}): GeometryBatch {
  const { frame, fx, color, groupRows } = input;
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as SmoothParams;
  const { positions, rowIndex, pathOffsets, strokes } = writeSmoothLineGeometry({
    frame,
    fx,
    color,
    groupRows,
  });
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    pathOffsets,
    strokes,
    linewidth: params.linewidth ?? DEFAULT_SMOOTH_LINEWIDTH,
    alpha: params.alpha ?? 1,
    curve: "linear",
  };
}
