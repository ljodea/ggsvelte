/**
 * Layer grouping and carried discrete columns for stats/identity frames.
 */
import { deriveGroups } from "../grouping.js";
import type { CellValue, Discreteness } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { LayerBinding } from "./types.js";

export function deriveLayerGroups(binding: LayerBinding, table: ColumnTable): number[] {
  const aes = binding.layer.aes ?? {};
  const declared: Record<string, Discreteness> = {};
  for (const mapping of Object.values(aes)) {
    if (
      mapping !== null &&
      mapping !== undefined &&
      "field" in mapping &&
      table.has(mapping.field)
    ) {
      const conversion =
        mapping.field === binding.xField
          ? binding.xConversion
          : mapping.field === binding.yField ||
              mapping.field === binding.yminField ||
              mapping.field === binding.ymaxField
            ? binding.yConversion
            : undefined;
      declared[mapping.field] =
        conversion === undefined
          ? table.discreteness(mapping.field)
          : table.discreteness(mapping.field, conversion.sourceParser, conversion.options);
    }
  }
  return [...deriveGroups(table.columns(), aes, declared).groups];
}

/** Carried discrete columns for stats (color/fill/label, minus the x field). */
export function carriedColumns(
  binding: LayerBinding,
  table: ColumnTable,
): Record<string, readonly CellValue[]> {
  const carried: Record<string, readonly CellValue[]> = {};
  for (const field of [binding.color.field, binding.fill.field, binding.labelField]) {
    if (field !== null && field !== binding.xField) carried[field] = table.column(field);
  }
  return carried;
}
