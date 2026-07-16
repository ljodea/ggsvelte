/**
 * Build panel placements for facet grids or a single panel.
 */
import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import { placeFacetPanels } from "./panel-layout-facet.js";
import { placeSinglePanel } from "./panel-layout-single.js";
import type { PanelPlacement } from "./panel-layout-types.js";
import type { FacetPanelDef } from "./facets.js";
import type { RunOptions } from "./types.js";

export function buildPanelPlacements(input: {
  faceted: boolean;
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  chrome: PanelLayoutChrome;
  options: Pick<RunOptions, "width">;
}): PanelPlacement[] {
  const { faceted, nrow, ncol, facetPanels, chrome, options } = input;

  if (faceted) {
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
      hBreaks: chrome.hBreaks,
      vBreaks: chrome.vBreaks,
      formatH: chrome.formatH,
      formatV: chrome.formatV,
      measurer: chrome.measurer,
      layoutTheme: chrome.layoutTheme,
    });
  }

  const { h, v } = chrome.displayScales(0);
  return [
    placeSinglePanel({
      h,
      v,
      hTitle: chrome.hTitle,
      vTitle: chrome.vTitle,
      axisTitleBand: chrome.axisTitleBand,
      legendWidth: chrome.legendBlock.width,
      optionsWidth: options.width,
      layoutHeight: chrome.layoutHeight,
      topBand: chrome.topBand,
      hBreaks: chrome.hBreaks,
      vBreaks: chrome.vBreaks,
      formatH: chrome.formatH,
      formatV: chrome.formatV,
      measurer: chrome.measurer,
      layoutTheme: chrome.layoutTheme,
    }),
  ];
}
