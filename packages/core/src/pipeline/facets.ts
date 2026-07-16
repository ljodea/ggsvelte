/**
 * Facet partition (BEFORE stats/positions — plan round-2 consensus).
 * Counts, bins, stacks, and dodges are panel-local, exactly like ggplot2.
 */
import type { FacetSpec } from "@ggsvelte/spec";
import { didYouMean } from "@ggsvelte/spec";

import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber, ColumnTable } from "../table.js";

import { PipelineError } from "./types.js";

// ---------------------------------------------------------------------------
// Facet partition (BEFORE stats/positions — plan round-2 consensus)
// ---------------------------------------------------------------------------

export interface FacetPanelDef {
  /** Stable facet field/value identity; independent of display position. */
  id: string;
  /** Strip label ("" = no strip; the unfaceted single panel). */
  label: string;
  row: number;
  col: number;
  table: ColumnTable;
  /** Panel-local row -> source row (null = identity, unfaceted). */
  sourceRows: number[] | null;
}

export interface FacetLayout {
  faceted: boolean;
  panels: FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeX: boolean;
  freeY: boolean;
}

function facetField(
  ref: { field: string } | undefined,
  key: "wrap" | "rows" | "cols",
  table: ColumnTable,
): string | null {
  if (ref === undefined) return null;
  if (!table.has(ref.field)) {
    const suggestion = didYouMean(ref.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/facet/${key}`,
      `Unknown facet field "${ref.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  return ref.field;
}

/**
 * Distinct values of a facet column in ggplot2 panel order: ascending —
 * numeric for quantitative/temporal fields, lexicographic for the rest —
 * with null last (its own panel, like ggplot2's NA panel).
 */
function facetValues(table: ColumnTable, field: string): CellValue[] {
  const seen = new Map<string, CellValue>();
  for (const v of table.column(field)) {
    const key = bandKey(v);
    if (!seen.has(key)) seen.set(key, v);
  }
  const values = [...seen.values()];
  const numeric = table.fieldType(field) !== "nominal";
  values.sort((a, b) => {
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    if (numeric) return cellToNumber(a) - cellToNumber(b);
    const ka = bandKey(a);
    const kb = bandKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return values;
}

function panelValueToken(value: CellValue): string {
  if (value instanceof Date) return `d:${value.getTime()}`;
  if (value === null) return "null";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "number") return `n:${Object.is(value, -0) ? 0 : value}`;
  return `b:${value}`;
}

function panelComponentToken(field: string, value: CellValue): string {
  const token = panelValueToken(value);
  return `${field.length}:${field}=${token.length}:${token}`;
}

function rowsMatching(table: ColumnTable, field: string, value: CellValue): number[] {
  const key = bandKey(value);
  const column = table.column(field);
  const rows: number[] = [];
  for (let i = 0; i < column.length; i++) {
    if (bandKey(column[i]!) === key) rows.push(i);
  }
  return rows;
}

export const SINGLE_PANEL = (table: ColumnTable): FacetLayout => ({
  faceted: false,
  panels: [{ id: "panel:all", label: "", row: 0, col: 0, table, sourceRows: null }],
  nrow: 1,
  ncol: 1,
  freeX: false,
  freeY: false,
});

export function resolveFacet(facet: FacetSpec | undefined, table: ColumnTable): FacetLayout {
  if (facet === undefined) return SINGLE_PANEL(table);
  const wrapField = facetField(facet.wrap, "wrap", table);
  const rowsField = facetField(facet.rows, "rows", table);
  const colsField = facetField(facet.cols, "cols", table);
  if (wrapField !== null && (rowsField !== null || colsField !== null)) {
    throw new PipelineError(
      "facet-form-ambiguous",
      "/facet",
      "This facet mixes the wrap form (facet.wrap) with the grid form (facet.rows/facet.cols). Use wrap OR rows/cols, never both.",
    );
  }
  if (wrapField === null && rowsField === null && colsField === null) {
    throw new PipelineError(
      "facet-form-missing",
      "/facet",
      "This facet sets neither wrap nor rows/cols — there is no field to partition panels by.",
    );
  }
  const scales = facet.scales ?? "fixed";
  const freeX = scales === "free" || scales === "free_x";
  const freeY = scales === "free" || scales === "free_y";

  if (wrapField !== null) {
    const values = facetValues(table, wrapField);
    if (values.length === 0) return SINGLE_PANEL(table);
    const ncol = Math.min(values.length, facet.ncol ?? Math.ceil(Math.sqrt(values.length)));
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
