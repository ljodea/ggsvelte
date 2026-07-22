/**
 * Partition a layer table into a facet panel (#589).
 *
 * ggplot2 map_facet_data semantics:
 * - layer has all facet fields → exact match to panel values
 * - layer has a subset (grid) → match present fields, replicate across missing
 * - layer has none → replicate full table into every panel
 */
import { encodeKey } from "../scales/state.js";
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets-types.js";
import type { SourceRegistry } from "./source-registry.js";
import { NO_ROW } from "./types-no-row.js";

export interface LayerPanelSlice {
  table: ColumnTable;
  /**
   * Panel-local row → global source-row id (SourceRegistry).
   * null only when the slice is identity over an empty mapping (unused).
   */
  globalSourceRows: number[];
}

/**
 * Facet fields declared on the plot (order: wrap, then rows, then cols).
 */
export function facetFieldNames(
  facet:
    | {
        wrap?: { field: string };
        rows?: { field: string };
        cols?: { field: string };
      }
    | undefined,
): string[] {
  if (facet === undefined) return [];
  const names: string[] = [];
  if (facet.wrap !== undefined) names.push(facet.wrap.field);
  if (facet.rows !== undefined) names.push(facet.rows.field);
  if (facet.cols !== undefined) names.push(facet.cols.field);
  return names;
}

/** Encoded facet field values on a panel identity (by field name). */
function panelFacetEncodedValues(panel: FacetPanelDef): Map<string, string> {
  const out = new Map<string, string>();
  for (const factor of panel.identity.values) {
    out.set(factor.field, factor.encodedValue);
  }
  return out;
}

/**
 * Slice `sourceTable` (unfiltered) for one panel, after optional filter remap.
 *
 * `filteredToSource` maps filtered-local index → unfiltered local index
 * (null = identity). `sourceId` + registry produce global ids.
 */
export function sliceLayerForPanel(input: {
  filteredTable: ColumnTable;
  filteredToSource: number[] | null;
  sourceId: number;
  registry: SourceRegistry;
  panel: FacetPanelDef;
  facetFields: readonly string[];
  faceted: boolean;
}): LayerPanelSlice {
  const { filteredTable, filteredToSource, sourceId, registry, panel, facetFields, faceted } =
    input;

  if (!faceted || facetFields.length === 0) {
    // Single panel: filtered table rows → global via filter remap.
    const globalSourceRows: number[] = [];
    for (let i = 0; i < filteredTable.rowCount; i++) {
      const local = filteredToSource?.[i] ?? i;
      globalSourceRows.push(registry.toGlobal(sourceId, local));
    }
    return { table: filteredTable, globalSourceRows };
  }

  const presentFields = facetFields.filter((f) => filteredTable.has(f));
  const panelEncoded = panelFacetEncodedValues(panel);

  // No facet fields on this layer → full table in every panel (replicate).
  if (presentFields.length === 0) {
    const globalSourceRows: number[] = [];
    for (let i = 0; i < filteredTable.rowCount; i++) {
      const local = filteredToSource?.[i] ?? i;
      globalSourceRows.push(registry.toGlobal(sourceId, local));
    }
    return { table: filteredTable, globalSourceRows };
  }

  // Match present fields to panel values; missing facet dims replicate.
  const keep: number[] = [];
  const globalSourceRows: number[] = [];
  for (let i = 0; i < filteredTable.rowCount; i++) {
    let match = true;
    for (const field of presentFields) {
      const wanted = panelEncoded.get(field);
      if (wanted === undefined) continue;
      const cell = filteredTable.column(field)[i]!;
      if (encodeKey(cell) !== wanted) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    keep.push(i);
    const local = filteredToSource?.[i] ?? i;
    globalSourceRows.push(registry.toGlobal(sourceId, local));
  }

  if (keep.length === filteredTable.rowCount) {
    return { table: filteredTable, globalSourceRows };
  }
  return { table: filteredTable.subset(keep), globalSourceRows };
}

/** Remap frame.rowIndex panel-local indices through globalSourceRows. */
export function remapToGlobalSourceRows(
  rowIndex: Uint32Array,
  globalSourceRows: readonly number[],
): void {
  for (let i = 0; i < rowIndex.length; i++) {
    const local = rowIndex[i]!;
    if (local === NO_ROW) continue;
    rowIndex[i] = globalSourceRows[local] ?? NO_ROW;
  }
}
