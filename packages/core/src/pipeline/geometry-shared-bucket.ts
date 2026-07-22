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

/**
 * Sort each group's row indices by ascending x (path/line/area/smooth).
 *
 * Callers pass groups already filtered by {@link bucketByGroup} (finite x/y).
 * Band x: materialize domain ranks once — O(R) `indexOf`/encodeKey lookups —
 * then O(1) comparator reads (not O(R log R) key re-evals during sort).
 * Continuous x: compare `frame.xNumeric` directly (no key array).
 */
export function sortGroupRowsByX(
  groupRows: readonly number[][],
  frame: LayerFrame,
  fx: Frame,
): void {
  if (fx.xScale.type === "band") {
    const keys = new Float64Array(frame.n);
    const xValues = frame.xValues;
    for (let row = 0; row < frame.n; row++) {
      keys[row] = fx.xScale.indexOf(xValues?.[row] ?? null) ?? Number.MAX_SAFE_INTEGER;
    }
    for (const rows of groupRows) rows.sort((a, b) => keys[a]! - keys[b]!);
    return;
  }
  const x = frame.xNumeric!;
  for (const rows of groupRows) rows.sort((a, b) => x[a]! - x[b]!);
}
