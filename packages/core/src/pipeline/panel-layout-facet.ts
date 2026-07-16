/**
 * Facet-grid panel placement: shared margin pass, free-scale edge axes, strips.
 */
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import { mapFacetPanelPlacements } from "./panel-layout-facet-map.js";
import { computeFacetGridGeometry } from "./panel-layout-facet-margins.js";
import type { DisplayScalesFn, PanelPlacement } from "./panel-layout-types.js";

export function placeFacetPanels(input: {
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
}): PanelPlacement[] {
  const geometry = computeFacetGridGeometry(input);
  return mapFacetPanelPlacements({
    facetPanels: input.facetPanels,
    freeH: input.freeH,
    freeV: input.freeV,
    displayScales: input.displayScales,
    mMax: geometry.mMax,
    panelW: geometry.panelW,
    panelH: geometry.panelH,
    colX: geometry.colX,
    rowY: geometry.rowY,
    bottomMostRow: geometry.bottomMostRow,
    hBreaks: input.hBreaks,
    vBreaks: input.vBreaks,
    formatH: input.formatH,
    formatV: input.formatV,
    measurer: input.measurer,
    layoutTheme: input.layoutTheme,
  });
}
