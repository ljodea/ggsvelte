/**
 * Facet panel row matching (encodeKey preserves `"1"`/`1` and `0`/`-0`).
 */
import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

export function rowsMatching(table: ColumnTable, field: string, value: CellValue): number[] {
  const key = encodeKey(value);
  const column = table.column(field);
  const rows: number[] = [];
  for (let i = 0; i < column.length; i++) {
    if (encodeKey(column[i]!) === key) rows.push(i);
  }
  return rows;
}
