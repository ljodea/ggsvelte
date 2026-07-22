/**
 * Bind data, facet-partition, and build per-panel LayerFrames (stat + position).
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { bindData, bindLayer } from "./bind.js";
import type { FacetLayout } from "./facets.js";
import { resolveFacet, SINGLE_PANEL } from "./facets.js";
import { warnEmptyData } from "./prepare-panels-empty.js";
import { buildPanelFrames } from "./prepare-panels-frames.js";
import { applyRuntimeRowFilters } from "./prepare-panels-row-filters.js";
import { positionConversionContext } from "./temporal-position.js";
import { assertScaleConfiguration } from "./scale-config-preflight.js";
import { assertTemporalConfiguration, preflightTemporalBindings } from "./temporal-preflight.js";
import type { PreparedPanels } from "./prepare-panels-types.js";
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

export function preparePanels(
  normalized: PortableSpec,
  options: RunOptions,
  warnings: PipelineWarning[],
  advisories: Advisory[],
): PreparedPanels {
  const sourceTable = bindData(normalized, options);
  const filtered = applyRuntimeRowFilters(sourceTable, options.rowFilters);
  const table = filtered.table;
  const emptyData = table.rowCount === 0;
  if (emptyData) warnEmptyData(warnings);
  const conversions = {
    x: positionConversionContext(normalized.scales?.x),
    y: positionConversionContext(normalized.scales?.y),
  };
  assertTemporalConfiguration("x", conversions.x);
  assertTemporalConfiguration("y", conversions.y);
  // Structural transform/zero contradictions are rejected before data
  // execution (normalize left them uncanonicalized on purpose).
  assertScaleConfiguration("x", normalized.scales?.x);
  assertScaleConfiguration("y", normalized.scales?.y);

  const facetLayout: FacetLayout = emptyData
    ? SINGLE_PANEL(table, filtered.sourceRows)
    : resolveFacet(normalized.facet, table, filtered.sourceRows);
  const { faceted, nrow, ncol } = facetLayout;
  const facetPanels = facetLayout.panels;
  const freeX = faceted && facetLayout.freeX;
  const freeY = faceted && facetLayout.freeY;

  let bindings: LayerBinding[] = [];
  let panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  let scaleDecisions: ScaleDecision[] = [];
  let scaleDiagnostics: ScaleDiagnostic[] = [];
  let resolvedConversions = conversions;
  if (!emptyData) {
    const built = buildPanelFrames({
      normalized,
      table,
      sourceTable,
      facetPanels,
      faceted,
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
  } else if (sourceTable.fields.length > 0) {
    // Runtime filters can empty the table; bindings still resolve against the
    // filtered table so color/fill scales keep the full source-value catalog.
    for (let index = 0; index < normalized.layers.length; index++) {
      const binding = bindLayer(normalized.layers[index]!, index, table, warnings, conversions);
      binding.color.forcedDiscrete = ["ordinal", "manual"].includes(
        normalized.scales?.color?.type ?? "",
      );
      binding.fill.forcedDiscrete = ["ordinal", "manual"].includes(
        normalized.scales?.fill?.type ?? "",
      );
      bindings.push(binding);
    }
    // Parsing is a source contract, not a rendered-row optimization. Validate
    // the complete source even when runtime filters remove every row.
    const temporal = preflightTemporalBindings({
      table: sourceTable,
      bindings,
      warnings,
      advisories,
      conversions,
    });
    scaleDecisions = temporal.decisions;
    scaleDiagnostics = temporal.diagnostics;
    resolvedConversions = { x: temporal.xConversion, y: temporal.yConversion };
  }

  return {
    table,
    sourceTable,
    emptyData,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    facetPanels,
    bindings,
    panelFrames,
    scaleDecisions,
    scaleDiagnostics,
    xConversion: resolvedConversions.x,
    yConversion: resolvedConversions.y,
  };
}
