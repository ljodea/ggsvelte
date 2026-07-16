/**
 * Facet grid cell sizes and absolute col/row placements.
 */
import type { Margins } from "../layout/layout.js";

import type { FacetPanelDef } from "./facets.js";
import { computeFacetColRowPlacements } from "./panel-layout-facet-cells-place.js";
import { computeFacetPanelSize } from "./panel-layout-facet-cells-size.js";

export interface FacetCellGeometry {
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}

export function computeFacetCellGeometry(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  outerLeft: number;
  topBand: number;
  spacing: number;
  strip: number;
  gridW: number;
  gridH: number;
}): FacetCellGeometry {
  const { panelW, panelH } = computeFacetPanelSize(input);
  const { colX, rowY, bottomMostRow } = computeFacetColRowPlacements({
    ...input,
    panelW,
    panelH,
  });
  return { panelW, panelH, colX, rowY, bottomMostRow };
}
