/**
 * Bind data, facet-partition, and build per-panel LayerFrames (stat + position).
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { bindData } from "./bind.js";
import type { FacetLayout, FacetPanelDef } from "./facets.js";
import { resolveFacet, SINGLE_PANEL } from "./facets.js";
import { buildPanelFrames } from "./prepare-panels-frames.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface PreparedPanels {
  table: ColumnTable;
  emptyData: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: FacetPanelDef[];
  bindings: LayerBinding[];
  panelFrames: LayerFrame[][];
}

export function preparePanels(
  normalized: PortableSpec,
  options: RunOptions,
  warnings: PipelineWarning[],
  advisories: Advisory[],
): PreparedPanels {
  const table = bindData(normalized, options);
  const emptyData = table.rowCount === 0;
  if (emptyData) {
    warnings.push({
      code: "empty-data",
      message: "The data has no rows; rendering the frame and axes as a placeholder.",
    });
  }

  const facetLayout: FacetLayout = emptyData
    ? SINGLE_PANEL(table)
    : resolveFacet(normalized.facet, table);
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
  }

  return {
    table,
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
