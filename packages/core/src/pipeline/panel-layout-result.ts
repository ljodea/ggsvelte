/**
 * Pack chrome + placements into PanelLayoutResult.
 */
import { planBasicAxis } from "../layout/temporal-guide.js";

import type { PanelLayoutChrome } from "./panel-layout-chrome.js";
import type { PanelLayoutResult, PanelPlacement } from "./panel-layout-types.js";

export function panelLayoutResultFromChrome(
  chrome: PanelLayoutChrome,
  placements: PanelPlacement[],
): PanelLayoutResult {
  const guidePlans = placements.flatMap((placement, panelIndex) => {
    const { h, v } = chrome.displayScales(panelIndex);
    const hAesthetic = chrome.flip ? "y" : "x";
    const vAesthetic = chrome.flip ? "x" : "y";
    return [
      ...(placement.showAxisX
        ? [
            placement.hGuidePlan ??
              planBasicAxis({
                aesthetic: hAesthetic,
                panelIndex,
                scale: h,
                ticks: placement.ticksH,
                config: chrome.scalesConfig[hAesthetic],
              }),
          ]
        : []),
      ...(placement.showAxisY
        ? [
            placement.vGuidePlan ??
              planBasicAxis({
                aesthetic: vAesthetic,
                panelIndex,
                scale: v,
                ticks: placement.ticksV,
                config: chrome.scalesConfig[vAesthetic],
              }),
          ]
        : []),
    ];
  });
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
    bottomBand: chrome.bottomBand,
    formatX: chrome.formatX,
    formatY: chrome.formatY,
    displayScales: chrome.displayScales,
    legendBlock: chrome.legendBlock,
    guidePlans: Object.freeze(guidePlans),
  };
}
