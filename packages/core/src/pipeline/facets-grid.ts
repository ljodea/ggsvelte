/**
 * Facet grid partition: rows × cols combinations (empty combos kept).
 */
import type { FacetFieldRef } from "@ggsvelte/spec";

import { createFacetPanelIdentity } from "../facet-identity.js";
import { encodeKey } from "../scales/state.js";
import type { ColumnTable } from "../table.js";

import { facetDisplayLabel, facetValues } from "./facets-helpers.js";
import { partitionByField, partitionByFields } from "./facets-tokens.js";
import type { FacetLayout, FacetPanelDef, FacetStripConfig } from "./facets-types.js";
import { SINGLE_PANEL } from "./facets-types.js";
import type { PipelineWarning } from "./types.js";

export function resolveFacetGrid(input: {
  table: ColumnTable;
  rowsField: string | null;
  rowsRef: FacetFieldRef | undefined;
  colsField: string | null;
  colsRef: FacetFieldRef | undefined;
  freeX: boolean;
  freeY: boolean;
  baseSourceRows: number[] | null;
  strip: FacetStripConfig;
  warnings: PipelineWarning[];
}): FacetLayout {
  const { table, rowsField, colsField, freeX, freeY, baseSourceRows, strip, warnings } = input;
  const rowLevels = input.rowsRef?.levels;
  const colLevels = input.colsRef?.levels;
  const rowLabels = input.rowsRef?.labels;
  const colLabels = input.colsRef?.labels;

  // Grid form: rows x cols, ALL combinations (empty combos render as empty
  // panels — ggplot2 keeps the full grid). Closed levels keep empty panels too.
  const rowValues =
    rowsField === null
      ? [null]
      : facetValues(table, rowsField, {
          ...(rowLevels !== undefined && { levels: rowLevels }),
          path: "/facet/rows/levels",
          warnings,
        });
  const colValues =
    colsField === null
      ? [null]
      : facetValues(table, colsField, {
          ...(colLevels !== undefined && { levels: colLevels }),
          path: "/facet/cols/levels",
          warnings,
        });
  if (
    (rowsField !== null && rowValues.length === 0) ||
    (colsField !== null && colValues.length === 0)
  ) {
    return SINGLE_PANEL(table, baseSourceRows);
  }
  // Partition rows once (issue #183): a full grid by the composite (row, col)
  // key, or a single dimension when only one field is set — O(n), then O(R·C)
  // bucket reads. With closed levels, an absent bucket is a genuine empty combo.
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
    // Closed levels may list row values never observed: missing outer/inner
    // buckets yield empty panels, not a hard throw.
    const rowInner = grid === null ? null : (grid.get(encodeKey(rowValues[r]!)) ?? null);
    const rowOnly = rowBuckets === null ? null : (rowBuckets.get(encodeKey(rowValues[r]!)) ?? []);
    for (let c = 0; c < colValues.length; c++) {
      let rows: number[];
      if (grid !== null) {
        // Full 2D grid: absent row or col bucket is an empty combination.
        rows = rowInner?.get(encodeKey(colValues[c]!)) ?? [];
      } else if (rowOnly !== null) {
        rows = rowOnly;
      } else if (colBuckets === null) {
        // Unreachable: assertFacetForm guarantees ≥1 grid field once wrap is null.
        throw new Error("facet grid resolved with neither rows nor cols field");
      } else {
        rows = colBuckets.get(encodeKey(colValues[c]!)) ?? [];
      }
      const parts: string[] = [];
      if (rowsField !== null) parts.push(facetDisplayLabel(rowValues[r]!, rowLabels));
      if (colsField !== null) parts.push(facetDisplayLabel(colValues[c]!, colLabels));
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
  return {
    faceted: true,
    panels,
    nrow: rowValues.length,
    ncol: colValues.length,
    freeX,
    freeY,
    strip,
  };
}
