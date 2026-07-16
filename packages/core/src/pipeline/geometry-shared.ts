/**
 * Shared geometry primitives: panel Frame, position mapping, grouping buckets,
 * and common mark defaults.
 */
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { LayerFrame, PipelineWarning } from "./types.js";

export const DEFAULT_POINT_SIZE = 2.5;
export const DEFAULT_LINEWIDTH = 1.5;
export const DEFAULT_RULE_LINEWIDTH = 1;
export const DEFAULT_BAR_WIDTH = 0.9;
export const DEFAULT_TEXT_SIZE = 11;

/** Panel-local frame extents + trained positional scales for batch builders. */
export interface Frame {
  innerWidth: number;
  innerHeight: number;
  xScale: PositionScale;
  yScale: PositionScale;
}

export function positionOf(
  scale: PositionScale,
  numeric: Float64Array | null,
  column: readonly CellValue[] | null,
  row: number,
  offsets: Float64Array | null = null,
): number {
  if (scale.type === "band") {
    const t = scale.normalize(column?.[row] ?? null);
    if (t === undefined) return NaN;
    // Offsets on discrete axes are band-step fractions.
    return offsets === null ? t : t + offsets[row]! * scale.step;
  }
  const v = numeric?.[row];
  if (v === undefined || !Number.isFinite(v)) return NaN;
  // Offsets on continuous axes are data units.
  return scale.normalize(offsets === null ? v : v + offsets[row]!);
}

export function removedWarning(removed: number, index: number, warnings: PipelineWarning[]): void {
  if (removed > 0) {
    warnings.push({
      code: "removed-missing",
      message: `Removed ${removed} row(s) with missing or non-finite positions (layer ${index}).`,
    });
  }
}

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
    const ty = positionOf(fx.yScale, yNumericOverride ?? frame.yNumeric, null, row);
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
