/**
 * Prepared panel partition result for the pipeline bind phase.
 */
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef, FacetStripConfig } from "./facets.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type { SourceRegistry } from "./source-registry.js";
import type { LayerBinding, LayerFrame, ScaleDecision, ScaleDiagnostic } from "./types.js";

/** Per-layer bound source + filter remap (#589). */
export interface LayerDataContext {
  sourceTable: ColumnTable;
  filteredTable: ColumnTable;
  filteredToSource: number[] | null;
  sourceId: number;
}

export interface PreparedPanels {
  table: ColumnTable;
  /** Unfiltered primary source (plot data or first layer); legacy single-table consumers. */
  sourceTable: ColumnTable;
  /** Multi-table global row registry for model.row() (#589). */
  sourceRegistry: SourceRegistry;
  /** Per-layer source/filter context. */
  layerContexts: readonly LayerDataContext[];
  emptyData: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  /** Resolved strip chrome (position + show); defaults when unfaceted. */
  strip: FacetStripConfig;
  facetPanels: FacetPanelDef[];
  bindings: LayerBinding[];
  panelFrames: LayerFrame[][];
  scaleDecisions: ScaleDecision[];
  scaleDiagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}
