/**
 * Area/density path geometry batch builder (closed ribbons).
 */
import type { PathsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { bucketByGroup, xSortKey } from "./geometry-shared.js";
import { appendClosedBandEdges } from "./geometry-paths-closed.js";

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
  let total = 0;
  for (const rows of groupRows) total += rows.length * 2;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    cursor = appendClosedBandEdges({
      positions,
      rowIndex,
      cursor,
      rows,
      frame,
      fx,
      yTop: frame.ymax,
      yBottom: frame.ymin,
    });
    let fillColor: string | null = binding.fill.constant;
    if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
      const first = rows[0]!;
      const value =
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[first]!;
      fillColor = colorOf(fill, value);
    }
    fills.push(fillColor);
    strokes.push(null);
  }
  pathOffsets[groupRows.length] = cursor;

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
