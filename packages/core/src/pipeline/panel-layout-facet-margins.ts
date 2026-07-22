/**
 * Facet grid: outer chrome, shared margin pass, and panel cell geometry.
 */
import { computeFacetCellGeometry } from "./panel-layout-facet-cells.js";
import type { FacetGridGeometryInput } from "./panel-layout-facet-margins-input.js";
import { computeFacetSharedMargins } from "./panel-layout-facet-margins-pass.js";
import type { FacetGridGeometry } from "./panel-layout-facet-margins-types.js";
import { computeFacetOuterChrome } from "./panel-layout-facet-outer.js";

export type { FacetGridGeometry } from "./panel-layout-facet-margins-types.js";
export type { FacetGridGeometryInput } from "./panel-layout-facet-margins-input.js";

export function computeFacetGridGeometry(input: FacetGridGeometryInput): FacetGridGeometry {
  const outer = computeFacetOuterChrome({
    nrow: input.nrow,
    ncol: input.ncol,
    outerLeftTitle: input.outerLeftTitle,
    outerBottomTitle: input.outerBottomTitle,
    axisTitleBand: input.axisTitleBand,
    legendWidth: input.legendWidth,
    optionsWidth: input.optionsWidth,
    layoutHeight: input.layoutHeight,
  });

  const shared = computeFacetSharedMargins({
    facetPanels: input.facetPanels,
    approxW: outer.approxW,
    approxH: outer.approxH,
    displayScales: input.displayScales,
    displayTemporal: input.displayTemporal,
    displayBand: input.displayBand,
    hBreaks: input.hBreaks,
    vBreaks: input.vBreaks,
    formatH: input.formatH,
    formatV: input.formatV,
    measurer: input.measurer,
    layoutTheme: input.layoutTheme,
  });

  const cells = computeFacetCellGeometry({
    facetPanels: input.facetPanels,
    nrow: input.nrow,
    ncol: input.ncol,
    freeH: input.freeH,
    freeV: input.freeV,
    mMax: shared.margins,
    outerLeft: outer.outerLeft,
    topBand: input.topBand,
    spacing: outer.spacing,
    strip: outer.strip,
    gridW: outer.gridW,
    gridH: outer.gridH,
  });

  return {
    mMax: shared.margins,
    previousGuidePlans: shared.previousGuidePlans,
    ...cells,
  };
}
