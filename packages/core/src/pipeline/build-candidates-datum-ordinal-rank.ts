/**
 * Ordinal color/fill series rank for identity candidates.
 *
 * Uses ColorScale.indexOf (encodeKey Map from training) — O(1) per candidate,
 * not domain.findIndex with bandKey (O(d) and type-collapsing). Ranks match
 * color assignment (including value-stable gaps when series drop out of grow
 * state), not dense presentation-domain positions.
 */
import type { CellValue } from "../table.js";

import type { ResolvedColorScale } from "./types.js";

/**
 * O(1) assignment rank, or -1 when scale/field does not apply.
 * `readValue` is a thunk so sequential/null scales never force a cell read.
 */
export function ordinalColorRank(
  resolved: ResolvedColorScale | null,
  field: string | null | undefined,
  readValue: () => CellValue,
): number {
  if (resolved?.kind !== "ordinal" || field === null || field === undefined) return -1;
  return resolved.scale.indexOf(readValue()) ?? -1;
}

export function ordinalSeriesRank(input: {
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  colorField: string | undefined;
  fillField: string | undefined;
  sourceRow: number | null;
  sourceValue: (field: string | undefined) => CellValue;
  group: number;
}): number {
  const { color, fill, colorField, fillField, sourceRow, sourceValue, group } = input;
  if (sourceRow === null) return group;
  const colorRank = ordinalColorRank(color, colorField, () => sourceValue(colorField));
  const fillRank = ordinalColorRank(fill, fillField, () => sourceValue(fillField));
  return colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group;
}
