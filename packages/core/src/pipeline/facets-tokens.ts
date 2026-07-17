/**
 * Facet panel row partition (encodeKey preserves `"1"`/`1` and `0`/`-0`).
 *
 * One O(n) scan groups row indices by field value — wrap/grid assemble panels
 * from these buckets instead of re-scanning once per value/cell (issue #183).
 */
import { encodeKey } from "../scales/state.js";
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
