/**
 * Prepared panel partition result for the pipeline bind phase.
 */
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import type { LayerBinding, LayerFrame } from "./types.js";

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
