/**
 * Facet wrap partition: one panel per distinct value, near-square ncol default.
 */
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { facetValues, panelValueToken, rowsMatching } from "./facets-helpers.js";
import type { FacetLayout } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";

export function resolveFacetWrap(input: {
  table: ColumnTable;
  wrapField: string;
  ncol: number | undefined;
  freeX: boolean;
  freeY: boolean;
}): FacetLayout {
  const { table, wrapField, freeX, freeY } = input;
  const values = facetValues(table, wrapField);
  if (values.length === 0) return SINGLE_PANEL(table);
  const ncol = Math.min(values.length, input.ncol ?? Math.ceil(Math.sqrt(values.length)));
  const nrow = Math.ceil(values.length / ncol);
  const panels = values.map((value, i) => {
    const rows = rowsMatching(table, wrapField, value);
    return {
      id: `panel:wrap:${wrapField}=${panelValueToken(value)}`,
      label: bandKey(value),
      row: Math.floor(i / ncol),
      col: i % ncol,
      table: table.subset(rows),
      sourceRows: rows,
    };
  });
  return { faceted: true, panels, nrow, ncol, freeX, freeY };
}
