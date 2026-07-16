/**
 * Ordinal color/fill series rank for identity candidates.
 */
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { ResolvedColorScale } from "./types.js";

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
  const ordinalRank = (resolved: ResolvedColorScale | null, field: string | undefined) => {
    if (resolved?.kind !== "ordinal" || field === undefined || sourceRow === null) return -1;
    const key = bandKey(sourceValue(field));
    return resolved.scale.domain.findIndex((value) => bandKey(value) === key);
  };
  const colorRank = ordinalRank(color, colorField);
  const fillRank = ordinalRank(fill, fillField);
  return colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group;
}
