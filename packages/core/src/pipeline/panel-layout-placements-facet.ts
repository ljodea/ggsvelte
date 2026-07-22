/**
 * Facet-grid panel placements from layout chrome.
 */
import type { LayoutAxisPresentation } from "../layout/layout.js";

import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import { placeFacetPanels } from "./panel-layout-facet.js";
import type { PanelPlacement } from "./panel-layout-types.js";
import type { FacetPanelDef } from "./facets.js";
import type { RunOptions } from "./types.js";

export function placeFacetPanelsFromChrome(input: {
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  chrome: PanelLayoutChrome;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
  options: Pick<RunOptions, "width">;
}): PanelPlacement[] {
  const { nrow, ncol, facetPanels, chrome, axis, options } = input;
  return placeFacetPanels({
    facetPanels,
    nrow,
    ncol,
    freeH: chrome.freeH,
    freeV: chrome.freeV,
    outerLeftTitle: chrome.vTitle,
    outerBottomTitle: chrome.hTitle,
    axisTitleBand: chrome.axisTitleBand,
    legendWidth: chrome.legendBlock.width,
    legendBottomHeight: chrome.legendBlock.bottomHeight,
    optionsWidth: options.width,
    layoutHeight: chrome.layoutHeight,
    topBand: chrome.topBand,
    displayScales: chrome.displayScales,
    displayTemporal: chrome.displayTemporal,
    displayBand: chrome.displayBand,
    hBreaks: chrome.hBreaks,
    vBreaks: chrome.vBreaks,
    formatH: chrome.formatH,
    formatV: chrome.formatV,
    measurer: chrome.measurer,
    layoutTheme: chrome.layoutTheme,
    axis,
  });
}
