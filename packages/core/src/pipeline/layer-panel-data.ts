/**
 * Partition a layer table into a facet panel (#589).
 *
 * ggplot2 map_facet_data semantics:
 * - layer has all facet fields → exact match to panel values
 * - layer has a subset (grid) → match present fields, replicate across missing
 * - layer has none → replicate full table into every panel
 */
import type { ColumnTable } from "../table.js";

import { partitionByField, partitionByFields } from "./facets-tokens.js";
import type { FacetPanelDef } from "./facets-types.js";
import type { SourceRegistry } from "./source-registry.js";

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

export interface LayerPanelSlicerInput {
  filteredTable: ColumnTable;
  filteredToSource: number[] | null;
  sourceId: number;
  registry: SourceRegistry;
  facetFields: readonly string[];
  faceted: boolean;
}

/**
 * Row buckets for one layer, keyed by the facet fields that layer actually
 * carries. `assertFacetForm` allows wrap XOR grid, so there are at most two.
 */
type RowBuckets =
  | { fields: 0 }
  | { fields: 1; byA: Map<string, number[]> }
  | { fields: 2; byAB: Map<string, Map<string, number[]>> };

/**
 * Prepare a layer for slicing into every panel of a facet layout.
 *
 * The panels partition the rows, so grouping once and looking each panel up
 * costs O(rows) for the layer rather than O(rows) per panel.
 *
 * `filteredToSource` maps filtered-local index → unfiltered local index
 * (null = identity). `sourceId` + registry produce global ids.
 */
export function createLayerPanelSlicer(
  input: LayerPanelSlicerInput,
): (panel: FacetPanelDef) => LayerPanelSlice {
  const { filteredTable, filteredToSource, sourceId, registry, facetFields, faceted } = input;

  // Panel-local row → global source row, once for the whole layer.
  const allGlobals: number[] = [];
  for (let i = 0; i < filteredTable.rowCount; i++) {
    allGlobals.push(registry.toGlobal(sourceId, filteredToSource?.[i] ?? i));
  }

  const presentFields =
    faceted && facetFields.length > 0 ? facetFields.filter((f) => filteredTable.has(f)) : [];

  // Unfaceted, or no facet field on this layer → every panel takes the whole
  // table. finalizeFrameSourceRows copies globalSourceRows, so one shared slice
  // cannot leak between panels.
  if (presentFields.length === 0) {
    const whole: LayerPanelSlice = { table: filteredTable, globalSourceRows: allGlobals };
    return () => whole;
  }

  const buckets: RowBuckets =
    presentFields.length === 1
      ? { fields: 1, byA: partitionByField(filteredTable, presentFields[0]!) }
      : {
          fields: 2,
          byAB: partitionByFields(filteredTable, presentFields[0]!, presentFields[1]!),
        };

  return (panel: FacetPanelDef): LayerPanelSlice => {
    const panelEncoded = panelFacetEncodedValues(panel);
    // Every declared facet field appears on every panel identity (facets-wrap
    // and facets-grid build them all from the same fields), and presentFields
    // is a subset of those, so a miss here means the layout invariant broke.
    const wantedFor = (field: string): string => {
      const wanted = panelEncoded.get(field);
      if (wanted === undefined) {
        throw new Error(
          `facet panel identity is missing the facet field "${field}" the layer partitions on`,
        );
      }
      return wanted;
    };

    // A key with no rows is an empty panel, not an error: closed facet levels
    // and sparse grid combinations both name values the layer never sees.
    const keep =
      buckets.fields === 1
        ? (buckets.byA.get(wantedFor(presentFields[0]!)) ?? [])
        : (buckets.byAB.get(wantedFor(presentFields[0]!))?.get(wantedFor(presentFields[1]!)) ?? []);

    // Keeping every row returns the original table instance — SourceRegistry
    // namespaces on object identity. This also covers the empty table, where
    // the old scan returned the original rather than an empty subset.
    if (keep.length === filteredTable.rowCount) {
      return { table: filteredTable, globalSourceRows: allGlobals };
    }
    return {
      table: filteredTable.subset(keep),
      globalSourceRows: keep.map((i) => allGlobals[i]!),
    };
  };
}

/**
 * Slice `sourceTable` (unfiltered) for one panel, after optional filter remap.
 *
 * Prefer {@link createLayerPanelSlicer} when slicing a layer into every panel;
 * this rebuilds the layer grouping on each call.
 */
export function sliceLayerForPanel(
  input: LayerPanelSlicerInput & { panel: FacetPanelDef },
): LayerPanelSlice {
  return createLayerPanelSlicer(input)(input.panel);
}
