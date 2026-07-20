/**
 * Prepared panel partition result for the pipeline bind phase.
 */
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, ScaleDecision, ScaleDiagnostic } from "./types.js";

export interface PreparedPanels {
  table: ColumnTable;
  /** Unfiltered bound table; retained for source-row lookups and the
   * color/fill catalog so runtime filters keep stable assignments. */
  sourceTable: ColumnTable;
  emptyData: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: FacetPanelDef[];
  bindings: LayerBinding[];
  panelFrames: LayerFrame[][];
  scaleDecisions: ScaleDecision[];
  scaleDiagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}
