/**
 * Pack chrome + placements into PanelLayoutResult.
 */
import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import type { PanelLayoutResult, PanelPlacement } from "./panel-layout-types.js";

export function panelLayoutResultFromChrome(
  chrome: PanelLayoutChrome,
  placements: PanelPlacement[],
): PanelLayoutResult {
  return {
    placements,
    title: chrome.title,
    subtitle: chrome.subtitle,
    caption: chrome.caption,
    hTitle: chrome.hTitle,
    vTitle: chrome.vTitle,
    xTitle: chrome.xTitle,
    yTitle: chrome.yTitle,
    topBand: chrome.topBand,
    formatX: chrome.formatX,
    formatY: chrome.formatY,
    displayScales: chrome.displayScales,
    legendBlock: chrome.legendBlock,
  };
}
