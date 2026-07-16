/**
 * Facet grid partition: rows × cols combinations (empty combos kept).
 */
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { facetValues, panelComponentToken, rowsMatching } from "./facets-helpers.js";
import type { FacetLayout, FacetPanelDef } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";

export function resolveFacetGrid(input: {
  table: ColumnTable;
  rowsField: string | null;
  colsField: string | null;
  freeX: boolean;
  freeY: boolean;
}): FacetLayout {
  const { table, rowsField, colsField, freeX, freeY } = input;
  // Grid form: rows x cols, ALL combinations (empty combos render as empty
  // panels — ggplot2 keeps the full grid).
  const rowValues = rowsField === null ? [null] : facetValues(table, rowsField);
  const colValues = colsField === null ? [null] : facetValues(table, colsField);
  if (
    (rowsField !== null && rowValues.length === 0) ||
    (colsField !== null && colValues.length === 0)
  ) {
    return SINGLE_PANEL(table);
  }
  const panels: FacetPanelDef[] = [];
  for (let r = 0; r < rowValues.length; r++) {
    for (let c = 0; c < colValues.length; c++) {
      let rows: number[] | null = null;
      if (rowsField !== null) rows = rowsMatching(table, rowsField, rowValues[r]!);
      if (colsField !== null) {
        const colRows = new Set(rowsMatching(table, colsField, colValues[c]!));
        rows =
          rows === null
            ? [...colRows].toSorted((a, b) => a - b)
            : rows.filter((i) => colRows.has(i));
      }
      const parts: string[] = [];
      if (rowsField !== null) parts.push(bandKey(rowValues[r]!));
      if (colsField !== null) parts.push(bandKey(colValues[c]!));
      panels.push({
        id: `panel:grid:${[
          ...(rowsField === null ? [] : [panelComponentToken(rowsField, rowValues[r]!)]),
          ...(colsField === null ? [] : [panelComponentToken(colsField, colValues[c]!)]),
        ].join("|")}`,
        label: parts.join(" / "),
        row: r,
        col: c,
        table: table.subset(rows ?? []),
        sourceRows: rows ?? [],
      });
    }
  }
  return { faceted: true, panels, nrow: rowValues.length, ncol: colValues.length, freeX, freeY };
}
