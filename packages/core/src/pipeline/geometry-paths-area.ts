/**
 * Area/density path geometry batch builder (closed ribbons).
 */
import type { PathsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { bucketByGroup, xSortKey } from "./geometry-shared.js";
import { writeClosedPathGroups } from "./geometry-paths-closed-batch.js";
import { areaGroupFillOf } from "./geometry-paths-area-fill.js";

export function areaBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const groupRows = bucketByGroup(frame, fx, frame.ymax, warnings);
  if (groupRows.length === 0) return null;
  const sortKey = xSortKey(frame, fx);
  for (const rows of groupRows) rows.sort((a, b) => sortKey(a) - sortKey(b));

  // Draw later-stacked groups first so the first-seen group paints on top.
  const { positions, rowIndex, pathOffsets, fills, strokes } = writeClosedPathGroups({
    frame,
    fx,
    groupRows,
    yTop: frame.ymax,
    yBottom: frame.ymin,
    fillOf: (rows) => areaGroupFillOf(frame, fill, rows),
  });

  const params: { alpha?: number } =
    binding.layer.geom === "area" || binding.layer.geom === "density"
      ? (binding.layer.params ?? {})
      : {};
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    pathOffsets,
    strokes,
    fills,
    closed: true,
    linewidth: 0,
    alpha: params.alpha ?? 1,
    curve: "linear",
  };
}
