/**
 * Group-bucket and x-sort helpers for path/line geometry builders.
 */
import type { LayerFrame, PipelineWarning } from "./types.js";
import type { Frame } from "./geometry-shared-position.js";
import { positionOf, removedWarning } from "./geometry-shared-position.js";

export function bucketByGroup(
  frame: LayerFrame,
  fx: Frame,
  yNumericOverride: Float64Array | null,
  warnings: PipelineWarning[],
): number[][] {
  const groupRows: number[][] = [];
  let removed = 0;
  for (let row = 0; row < frame.n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = positionOf(
      fx.yScale,
      yNumericOverride ?? frame.yNumeric,
      yNumericOverride instanceof Float64Array ? null : frame.yValues,
      row,
    );
    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      removed++;
      continue;
    }
    const g = frame.groups[row]!;
    (groupRows[g] ??= []).push(row);
  }
  removedWarning(removed, frame.binding.index, warnings);
  return groupRows.filter((rows) => rows !== undefined && rows.length > 0);
}

export function xSortKey(frame: LayerFrame, fx: Frame): (row: number) => number {
  return (row: number) =>
    fx.xScale.type === "band"
      ? (fx.xScale.indexOf(frame.xValues?.[row] ?? null) ?? Number.MAX_SAFE_INTEGER)
      : frame.xNumeric![row]!;
}
