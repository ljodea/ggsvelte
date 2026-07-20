/**
 * Facet-grid panel placements from layout chrome.
 */
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
  options: Pick<RunOptions, "width">;
}): PanelPlacement[] {
  const { nrow, ncol, facetPanels, chrome, options } = input;
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
    optionsWidth: options.width,
    layoutHeight: chrome.layoutHeight,
    topBand: chrome.topBand,
    displayScales: chrome.displayScales,
    displayTemporal: chrome.displayTemporal,
    hBreaks: chrome.hBreaks,
    vBreaks: chrome.vBreaks,
    formatH: chrome.formatH,
    formatV: chrome.formatV,
    measurer: chrome.measurer,
    layoutTheme: chrome.layoutTheme,
  });
}
