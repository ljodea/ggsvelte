/**
 * Facet wrap partition: one panel per distinct value, near-square ncol default.
 */
import { createFacetPanelIdentity } from "../facet-identity.js";
import { encodeKey } from "../scales/state.js";
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { facetValues } from "./facets-helpers.js";
import { partitionByField } from "./facets-tokens.js";
import type { FacetLayout } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";

export function resolveFacetWrap(input: {
  table: ColumnTable;
  wrapField: string;
  ncol: number | undefined;
  freeX: boolean;
  freeY: boolean;
  baseSourceRows: number[] | null;
}): FacetLayout {
  const { table, wrapField, freeX, freeY, baseSourceRows } = input;
  const values = facetValues(table, wrapField);
  if (values.length === 0) return SINGLE_PANEL(table, baseSourceRows);
  const ncol = Math.min(values.length, input.ncol ?? Math.ceil(Math.sqrt(values.length)));
  const nrow = Math.ceil(values.length / ncol);
  // One O(n) partition, then O(v) panel assembly (issue #183).
  const buckets = partitionByField(table, wrapField);
  const panels = values.map((value, i) => {
    // Every value came from facetValues() over this column, so its bucket
    // exists; a missing one is a broken contract and asserts loudly.
    const rows = buckets.get(encodeKey(value))!;
    const identity = createFacetPanelIdentity([{ role: "wrap", field: wrapField, value }]);
    return {
      identity,
      id: identity.key,
      label: bandKey(value),
      row: Math.floor(i / ncol),
      col: i % ncol,
      table: table.subset(rows),
      sourceRows: rows.map((row) => baseSourceRows?.[row] ?? row),
    };
  });
  return { faceted: true, panels, nrow, ncol, freeX, freeY };
}
