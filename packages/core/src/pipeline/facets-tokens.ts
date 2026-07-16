/**
 * Facet panel identity tokens and row matching.
 */
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

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
