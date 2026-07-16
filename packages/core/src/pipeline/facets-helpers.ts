/**
 * Shared helpers for facet partition (field resolution, value order, row match).
 */
import { didYouMean } from "@ggsvelte/spec";

import { encodeKey } from "../scales/state.js";
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber, ColumnTable } from "../table.js";

import { PipelineError } from "./types.js";

export { rowsMatching } from "./facets-tokens.js";

export function facetField(
  ref: { field: string } | undefined,
  key: "wrap" | "rows" | "cols",
  table: ColumnTable,
): string | null {
  if (ref === undefined) return null;
  if (!table.has(ref.field)) {
    const suggestion = didYouMean(ref.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/facet/${key}`,
      `Unknown facet field "${ref.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  return ref.field;
}

/**
 * Distinct values of a facet column in ggplot2 panel order: ascending —
 * numeric for quantitative/temporal fields, lexicographic for the rest —
 * with null last (its own panel, like ggplot2's NA panel).
 */
export function facetValues(table: ColumnTable, field: string): CellValue[] {
  const seen = new Map<string, CellValue>();
  for (const v of table.column(field)) {
    const key = encodeKey(v);
    if (!seen.has(key)) seen.set(key, v);
  }
  const values = [...seen.values()];
  const numeric = table.fieldType(field) !== "nominal";
  values.sort((a, b) => {
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    if (numeric) return cellToNumber(a) - cellToNumber(b);
    const ka = bandKey(a);
    const kb = bandKey(b);
    if (ka === kb) return encodeKey(a).localeCompare(encodeKey(b), "en");
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return values;
}
