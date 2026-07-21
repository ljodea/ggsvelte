/**
 * Panel Frame type, position mapping, removed-row warnings, and mark defaults.
 */
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { PipelineWarning } from "./types.js";

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
  // `numeric` is the already-transformed (scale-space) frame array; offsets
  // (stack/dodge/jitter/nudge) are also post-stat scale-space units. Use
  // normalizeTransformed so a transformed value is never forwarded twice.
  return scale.normalizeTransformed(offsets === null ? v : v + offsets[row]!);
}

export function removedWarning(removed: number, index: number, warnings: PipelineWarning[]): void {
  if (removed > 0) {
    warnings.push({
      code: "removed-missing",
      message: `Removed ${removed} row(s) with missing or non-finite positions (layer ${index}).`,
    });
  }
}
