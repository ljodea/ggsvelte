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
import type { PreparedPanels } from "./prepare-panels-types.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

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

  const facetLayout: FacetLayout = emptyData
    ? SINGLE_PANEL(table, filtered.sourceRows)
    : resolveFacet(normalized.facet, table, filtered.sourceRows);
  const { faceted, nrow, ncol } = facetLayout;
  const facetPanels = facetLayout.panels;
  const freeX = faceted && facetLayout.freeX;
  const freeY = faceted && facetLayout.freeY;

  let bindings: LayerBinding[] = [];
  let panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  if (!emptyData) {
    const built = buildPanelFrames({
      normalized,
      table,
      facetPanels,
      faceted,
      freeX,
      warnings,
      advisories,
    });
    bindings = built.bindings;
    panelFrames = built.panelFrames;
  } else if (sourceTable.fields.length > 0) {
    // Runtime filters can empty the table; bindings still resolve against the
    // filtered table so color/fill scales keep the full source-value catalog.
    for (let index = 0; index < normalized.layers.length; index++) {
      bindings.push(bindLayer(normalized.layers[index]!, index, table, warnings));
    }
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
  };
}
