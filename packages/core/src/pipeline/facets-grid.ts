/**
 * Facet grid partition: rows × cols combinations (empty combos kept).
 */
import { createFacetPanelIdentity } from "../facet-identity.js";
import { encodeKey } from "../scales/state.js";
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { facetValues } from "./facets-helpers.js";
import { partitionByField } from "./facets-tokens.js";
import type { FacetLayout, FacetPanelDef } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";

/** Intersect two ascending row-index lists (table order is ascending within buckets). */
function intersectSorted(a: readonly number[], b: readonly number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const av = a[i]!;
    const bv = b[j]!;
    if (av === bv) {
      out.push(av);
      i += 1;
      j += 1;
    } else if (av < bv) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return out;
}

export function resolveFacetGrid(input: {
  table: ColumnTable;
  rowsField: string | null;
  colsField: string | null;
  freeX: boolean;
  freeY: boolean;
  baseSourceRows: number[] | null;
}): FacetLayout {
  const { table, rowsField, colsField, freeX, freeY, baseSourceRows } = input;
  // Grid form: rows x cols, ALL combinations (empty combos render as empty
  // panels — ggplot2 keeps the full grid).
  const rowValues = rowsField === null ? [null] : facetValues(table, rowsField);
  const colValues = colsField === null ? [null] : facetValues(table, colsField);
  if (
    (rowsField !== null && rowValues.length === 0) ||
    (colsField !== null && colValues.length === 0)
  ) {
    return SINGLE_PANEL(table, baseSourceRows);
  }
  // Pre-partition once per dimension — O(n) each, then per-cell intersection
  // over bucket sizes (issue #183). Avoids O(R·C·n) full-table re-scans.
  const rowBuckets = rowsField === null ? null : partitionByField(table, rowsField);
  const colBuckets = colsField === null ? null : partitionByField(table, colsField);
  const panels: FacetPanelDef[] = [];
  for (let r = 0; r < rowValues.length; r++) {
    for (let c = 0; c < colValues.length; c++) {
      let rows: number[] = [];
      if (rowBuckets !== null && colBuckets !== null) {
        const rb = rowBuckets.get(encodeKey(rowValues[r]!)) ?? [];
        const cb = colBuckets.get(encodeKey(colValues[c]!)) ?? [];
        rows = intersectSorted(rb, cb);
      } else if (rowBuckets !== null) {
        rows = rowBuckets.get(encodeKey(rowValues[r]!)) ?? [];
      } else if (colBuckets !== null) {
        rows = colBuckets.get(encodeKey(colValues[c]!)) ?? [];
      }
      const parts: string[] = [];
      if (rowsField !== null) parts.push(bandKey(rowValues[r]!));
      if (colsField !== null) parts.push(bandKey(colValues[c]!));
      const identity = createFacetPanelIdentity([
        ...(rowsField === null
          ? []
          : [{ role: "rows" as const, field: rowsField, value: rowValues[r] }]),
        ...(colsField === null
          ? []
          : [{ role: "cols" as const, field: colsField, value: colValues[c] }]),
      ]);
      panels.push({
        identity,
        id: identity.key,
        label: parts.join(" / "),
        row: r,
        col: c,
        table: table.subset(rows),
        sourceRows: rows.map((row) => baseSourceRows?.[row] ?? row),
      });
    }
  }
  return { faceted: true, panels, nrow: rowValues.length, ncol: colValues.length, freeX, freeY };
}
