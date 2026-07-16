/**
 * Shared helpers for facet partition (field resolution, value order, row match).
 */
import { didYouMean } from "@ggsvelte/spec";

import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber, ColumnTable } from "../table.js";

import { PipelineError } from "./types.js";

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
    const key = bandKey(v);
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
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return values;
}

export function panelValueToken(value: CellValue): string {
  if (value instanceof Date) return `d:${value.getTime()}`;
  if (value === null) return "null";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "number") return `n:${Object.is(value, -0) ? 0 : value}`;
  return `b:${value}`;
}

export function panelComponentToken(field: string, value: CellValue): string {
  const token = panelValueToken(value);
  return `${field.length}:${field}=${token.length}:${token}`;
}

export function rowsMatching(table: ColumnTable, field: string, value: CellValue): number[] {
  const key = bandKey(value);
  const column = table.column(field);
  const rows: number[] = [];
  for (let i = 0; i < column.length; i++) {
    if (bandKey(column[i]!) === key) rows.push(i);
  }
  return rows;
}
