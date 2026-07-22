/**
 * Single-panel placement from layout chrome.
 */
import type { LayoutAxisPresentation } from "../layout/layout.js";

import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import { placeSinglePanel } from "./panel-layout-single.js";
import type { PanelPlacement } from "./panel-layout-types.js";
import type { RunOptions } from "./types.js";

export function placeSinglePanelFromChrome(
  chrome: PanelLayoutChrome,
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>,
  options: Pick<RunOptions, "width">,
): PanelPlacement {
  const { h, v } = chrome.displayScales(0);
  const temporal = chrome.displayTemporal(0);
  const band = chrome.displayBand(0);
  return placeSinglePanel({
    h,
    v,
    ...(temporal.h !== undefined && { hTemporal: temporal.h }),
    ...(temporal.v !== undefined && { vTemporal: temporal.v }),
    ...(band.h !== undefined && { hBand: band.h }),
    ...(band.v !== undefined && { vBand: band.v }),
    hTitle: chrome.hTitle,
    vTitle: chrome.vTitle,
    axisTitleBand: chrome.axisTitleBand,
    legendWidth: chrome.legendBlock.width,
    legendBottomHeight: chrome.legendBlock.bottomHeight,
    optionsWidth: options.width,
    layoutHeight: chrome.layoutHeight,
    topBand: chrome.topBand,
    hBreaks: chrome.hBreaks,
    vBreaks: chrome.vBreaks,
    formatH: chrome.formatH,
    formatV: chrome.formatV,
    measurer: chrome.measurer,
    layoutTheme: chrome.layoutTheme,
    axis,
  });
}
