/**
 * Line path geometry batch builder.
 */
import type { PathsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_LINEWIDTH, bucketByGroup, sortGroupRowsByX } from "./geometry-shared.js";
import { writeLineSubpaths } from "./geometry-paths-line-write.js";

export function lineBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  const subpaths = bucketByGroup(frame, fx, null, warnings);
  if (subpaths.length === 0) return null;
  sortGroupRowsByX(subpaths, frame, fx);

  const { positions, rowIndex, pathOffsets, strokes } = writeLineSubpaths({
    frame,
    fx,
    color,
    subpaths,
  });

  const params = binding.layer.geom === "line" ? (binding.layer.params ?? {}) : {};
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    pathOffsets,
    strokes,
    linewidth: params.linewidth ?? DEFAULT_LINEWIDTH,
    alpha: params.alpha ?? 1,
    curve: params.curve ?? "linear",
  };
}
