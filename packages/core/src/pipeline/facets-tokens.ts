/**
 * Facet panel row matching (encodeKey preserves `"1"`/`1` and `0`/`-0`).
 *
 * Prefer `partitionByField` for multi-panel builds: one O(n) scan instead of
 * re-scanning the column once per distinct value / grid cell (issue #183).
 */
import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

/**
 * Single-pass partition of table rows by a facet field's encodeKey.
 * Row indices within each bucket preserve table order.
 */
export function partitionByField(table: ColumnTable, field: string): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const column = table.column(field);
  for (let i = 0; i < column.length; i++) {
    const k = encodeKey(column[i]!);
    let bucket = map.get(k);
    if (bucket === undefined) map.set(k, (bucket = []));
    bucket.push(i);
  }
  return map;
}

/** Rows whose field equals value (encodeKey equality). Prefer partitionByField for multi-value builds. */
export function rowsMatching(table: ColumnTable, field: string, value: CellValue): number[] {
  const key = encodeKey(value);
  const column = table.column(field);
  const rows: number[] = [];
  for (let i = 0; i < column.length; i++) {
    if (encodeKey(column[i]!) === key) rows.push(i);
  }
  return rows;
}
