/**
 * Bind data (plot + per-layer), facet-partition, and build per-panel LayerFrames.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { ColumnTable, type CellValue } from "../table.js";

import { bindLayer } from "./bind.js";
import { bindLayerTable, bindPlotData } from "./bind-data.js";
import { configureStyleBindings } from "./bind-layer-style-config.js";
import type { FacetLayout } from "./facets.js";
import { resolveFacet, SINGLE_PANEL } from "./facets.js";
import { facetFieldNames } from "./layer-panel-data.js";
import { warnEmptyData } from "./prepare-panels-empty.js";
import { buildPanelFrames } from "./prepare-panels-frames.js";
import { applyRuntimeRowFilters } from "./prepare-panels-row-filters.js";
import { positionConversionContext } from "./temporal-position.js";
import { assertScaleConfiguration } from "./scale-config-preflight.js";
import { assertTemporalConfiguration, preflightTemporalBindings } from "./temporal-preflight.js";
import type { LayerDataContext, PreparedPanels } from "./prepare-panels-types.js";
import { SourceRegistry } from "./source-registry.js";
import type {
  Advisory,
  LayerBinding,
  LayerFrame,
  PipelineWarning,
  RunOptions,
  ScaleDecision,
  ScaleDiagnostic,
} from "./types.js";

export type { PreparedPanels } from "./prepare-panels-types.js";

/**
 * Choose the table used to build facet layout (#608):
 * - Collect every complete source (plot + layers that have all facet fields).
 * - One complete source → use it as-is.
 * - Several complete sources → concatenate facet columns so resolveFacet
 *   discovers the union of panel keys (layers still slice by panel identity).
 * - None complete → fall back so resolveFacet can emit unknown-field.
 */
function facetLayoutTable(
  facet: PortableSpec["facet"],
  plotTable: ColumnTable | null,
  layerSources: readonly ColumnTable[],
): ColumnTable {
  const fields = facetFieldNames(facet);
  if (fields.length === 0) {
    return plotTable ?? layerSources[0] ?? ColumnTable.fromRows([]);
  }
  const complete: ColumnTable[] = [];
  if (plotTable !== null && fields.every((f) => plotTable.has(f))) {
    complete.push(plotTable);
  }
  for (const table of layerSources) {
    if (fields.every((f) => table.has(f))) complete.push(table);
  }
  if (complete.length === 0) {
    // Fall back to plot or first layer so resolveFacet emits a clear unknown-field.
    return plotTable ?? layerSources[0] ?? ColumnTable.fromRows([]);
  }
  if (complete.length === 1) return complete[0]!;
  return unionFacetKeyColumns(complete, fields);
}

/** Concatenate facet-key columns from complete sources for layout discovery. */
function unionFacetKeyColumns(
  tables: readonly ColumnTable[],
  fields: readonly string[],
): ColumnTable {
  const columns: Record<string, CellValue[]> = {};
  for (const field of fields) columns[field] = [];
  for (const table of tables) {
    const cols = fields.map((f) => table.column(f));
    for (let row = 0; row < table.rowCount; row++) {
      for (let i = 0; i < fields.length; i++) {
        columns[fields[i]!]!.push(cols[i]![row]!);
      }
    }
  }
  return ColumnTable.fromColumns(columns);
}

/** Apply rowFilters only for clauses whose field exists on this layer table. */
function filterLayerTable(
  table: ColumnTable,
  clauses: RunOptions["rowFilters"],
): { table: ColumnTable; sourceRows: number[] | null } {
  if (clauses === undefined || clauses.length === 0) return { table, sourceRows: null };
  const applicable = clauses.filter((c) => table.has(c.field));
  return applyRuntimeRowFilters(table, applicable);
}

export function preparePanels(
  normalized: PortableSpec,
  options: RunOptions,
  warnings: PipelineWarning[],
  advisories: Advisory[],
): PreparedPanels {
  const registry = new SourceRegistry();
  const plotSource = bindPlotData(normalized, options);
  // Reuse ColumnTable instances for identical named refs so shared datasets
  // share SourceRegistry namespaces (and therefore source-row identity).
  const namedTableCache = new Map<string, ColumnTable>();

  const layerContexts: LayerDataContext[] = [];
  for (let index = 0; index < normalized.layers.length; index++) {
    const layer = normalized.layers[index]!;
    let sourceTable: ColumnTable;
    const layerData = layer.data;
    if (
      layerData !== undefined &&
      "name" in layerData &&
      !("values" in layerData) &&
      !("columns" in layerData)
    ) {
      const cacheKey = layerData.name;
      const cached = namedTableCache.get(cacheKey);
      if (cached === undefined) {
        sourceTable = bindLayerTable(layerData, plotSource, index, normalized, options);
        namedTableCache.set(cacheKey, sourceTable);
      } else {
        sourceTable = cached;
      }
    } else if (layerData === undefined && plotSource !== null) {
      sourceTable = plotSource;
    } else {
      sourceTable = bindLayerTable(layerData, plotSource, index, normalized, options);
      if (layerData !== undefined && "name" in layerData) {
        namedTableCache.set(layerData.name, sourceTable);
      }
    }
    const sourceId = registry.register(sourceTable);
    const filtered = filterLayerTable(sourceTable, options.rowFilters);
    layerContexts.push({
      sourceTable,
      filteredTable: filtered.table,
      filteredToSource: filtered.sourceRows,
      sourceId,
    });
  }

  // Primary table: plot source when present, else first layer source (for
  // legacy prepared.table / prepared.sourceTable consumers).
  const sourceTable = plotSource ?? layerContexts[0]?.sourceTable ?? ColumnTable.fromRows([]);
  const primaryFiltered =
    plotSource === null
      ? {
          table: layerContexts[0]?.filteredTable ?? ColumnTable.fromRows([]),
          sourceRows: layerContexts[0]?.filteredToSource ?? null,
        }
      : filterLayerTable(plotSource, options.rowFilters);
  const table = primaryFiltered.table;

  const emptyData = layerContexts.every((ctx) => ctx.filteredTable.rowCount === 0);
  if (emptyData) warnEmptyData(warnings);

  const conversions = {
    x: positionConversionContext(normalized.scales?.x),
    y: positionConversionContext(normalized.scales?.y),
  };
  assertTemporalConfiguration("x", conversions.x);
  assertTemporalConfiguration("y", conversions.y);
  assertScaleConfiguration("x", normalized.scales?.x);
  assertScaleConfiguration("y", normalized.scales?.y);

  const layoutTable = facetLayoutTable(
    normalized.facet,
    plotSource === null ? null : primaryFiltered.table,
    layerContexts.map((c) => c.filteredTable),
  );
  // Closed levels still produce empty panels when every row was filtered out;
  // only implicit (data-driven) facets collapse to a single placeholder.
  const hasClosedLevels =
    normalized.facet?.wrap?.levels !== undefined ||
    normalized.facet?.rows?.levels !== undefined ||
    normalized.facet?.cols?.levels !== undefined;
  const facetLayout: FacetLayout =
    emptyData && !hasClosedLevels
      ? SINGLE_PANEL(table, primaryFiltered.sourceRows)
      : resolveFacet(normalized.facet, layoutTable, null, warnings);
  const { faceted, nrow, ncol, strip } = facetLayout;
  const facetPanels = facetLayout.panels;
  const freeX = faceted && facetLayout.freeX;
  const freeY = faceted && facetLayout.freeY;
  const facetFields = facetFieldNames(normalized.facet);

  let bindings: LayerBinding[] = [];
  let panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  let scaleDecisions: ScaleDecision[] = [];
  let scaleDiagnostics: ScaleDiagnostic[] = [];
  let resolvedConversions = conversions;

  if (!emptyData) {
    const built = buildPanelFrames({
      normalized,
      layerContexts,
      registry,
      facetPanels,
      faceted,
      facetFields,
      freeX,
      warnings,
      advisories,
      conversions,
    });
    bindings = built.bindings;
    panelFrames = built.panelFrames;
    scaleDecisions = built.scaleDecisions;
    scaleDiagnostics = built.scaleDiagnostics;
    resolvedConversions = { x: built.xConversion, y: built.yConversion };
  } else if (
    sourceTable.fields.length > 0 ||
    layerContexts.some((c) => c.sourceTable.fields.length > 0)
  ) {
    for (let index = 0; index < normalized.layers.length; index++) {
      const ctx = layerContexts[index]!;
      const binding = bindLayer(
        normalized.layers[index]!,
        index,
        ctx.filteredTable,
        warnings,
        conversions,
        { sourceTable: ctx.sourceTable, sourceId: ctx.sourceId },
      );
      binding.color.forcedDiscrete = ["ordinal", "manual"].includes(
        normalized.scales?.color?.type ?? "",
      );
      binding.fill.forcedDiscrete = ["ordinal", "manual"].includes(
        normalized.scales?.fill?.type ?? "",
      );
      configureStyleBindings(binding, normalized.scales, ctx.filteredTable);
      bindings.push(binding);
    }
    const temporal = preflightTemporalBindings({
      table: sourceTable,
      bindings,
      warnings,
      advisories,
      conversions,
      layerTables: layerContexts.map((c) => c.sourceTable),
    });
    scaleDecisions = temporal.decisions;
    scaleDiagnostics = temporal.diagnostics;
    resolvedConversions = { x: temporal.xConversion, y: temporal.yConversion };
  }

  return {
    table,
    sourceTable,
    sourceRegistry: registry,
    layerContexts,
    emptyData,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    strip,
    facetPanels,
    bindings,
    panelFrames,
    scaleDecisions,
    scaleDiagnostics,
    xConversion: resolvedConversions.x,
    yConversion: resolvedConversions.y,
  };
}
