/**
 * Facet grid partition: rows × cols combinations (empty combos kept).
 */
import { createFacetPanelIdentity } from "../facet-identity.js";
import { encodeKey } from "../scales/state.js";
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { facetValues } from "./facets-helpers.js";
import { partitionByField, partitionByFields } from "./facets-tokens.js";
import type { FacetLayout, FacetPanelDef } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";

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
  // Partition rows once (issue #183): a full grid by the composite (row, col)
  // key, or a single dimension when only one field is set — O(n), then O(R·C)
  // bucket reads. Every rowValue/colValue comes from facetValues() over the
  // same column, so its bucket always exists; a missing one is a broken
  // contract and asserts loudly rather than silently emptying a panel. In the
  // full grid, an absent inner bucket is a genuine empty combination (`?? []`).
  const grid =
    rowsField !== null && colsField !== null
      ? partitionByFields(table, rowsField, colsField)
      : null;
  const rowBuckets =
    rowsField !== null && colsField === null ? partitionByField(table, rowsField) : null;
  const colBuckets =
    colsField !== null && rowsField === null ? partitionByField(table, colsField) : null;
  const panels: FacetPanelDef[] = [];
  for (let r = 0; r < rowValues.length; r++) {
    // Row-dimension lookup is loop-invariant across the col loop — hoist it.
    const rowInner = grid === null ? null : grid.get(encodeKey(rowValues[r]!))!;
    const rowOnly = rowBuckets === null ? null : rowBuckets.get(encodeKey(rowValues[r]!))!;
    for (let c = 0; c < colValues.length; c++) {
      let rows: number[];
      if (rowInner !== null) {
        rows = rowInner.get(encodeKey(colValues[c]!)) ?? [];
      } else if (rowOnly !== null) {
        rows = rowOnly;
      } else if (colBuckets === null) {
        // Unreachable: assertFacetForm guarantees ≥1 grid field once wrap is null.
        throw new Error("facet grid resolved with neither rows nor cols field");
      } else {
        rows = colBuckets.get(encodeKey(colValues[c]!))!;
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
