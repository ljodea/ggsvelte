/**
 * Facet partition result types.
 */
import type { ColumnTable } from "../table.js";

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

export const SINGLE_PANEL = (table: ColumnTable): FacetLayout => ({
  faceted: false,
  panels: [{ id: "panel:all", label: "", row: 0, col: 0, table, sourceRows: null }],
  nrow: 1,
  ncol: 1,
  freeX: false,
  freeY: false,
});
