/**
 * Facet grid: outer chrome, shared margin pass, and panel cell geometry.
 */
import type { LayoutTheme, Margins, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import { computeFacetCellGeometry } from "./panel-layout-facet-cells.js";
import { computeFacetSharedMargins } from "./panel-layout-facet-margins-pass.js";
import { computeFacetOuterChrome } from "./panel-layout-facet-outer.js";
import type { DisplayScalesFn } from "./panel-layout-types.js";

export interface FacetGridGeometry {
  mMax: Margins;
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}

export function computeFacetGridGeometry(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  outerLeftTitle: string;
  outerBottomTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  displayScales: DisplayScalesFn;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}): FacetGridGeometry {
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

  const mMax = computeFacetSharedMargins({
    facetPanels: input.facetPanels,
    approxW: outer.approxW,
    approxH: outer.approxH,
    displayScales: input.displayScales,
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
    mMax,
    outerLeft: outer.outerLeft,
    topBand: input.topBand,
    spacing: outer.spacing,
    strip: outer.strip,
    gridW: outer.gridW,
    gridH: outer.gridH,
  });

  return { mMax, ...cells };
}
