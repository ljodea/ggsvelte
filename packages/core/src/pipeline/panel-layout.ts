/**
 * Two-pass panel layout: facet grids and single-panel plots, including
 * axis-title/legend chrome and free-scale edge axes.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { LegendInput, LegendOrder } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import type { FacetPanelDef } from "./facets.js";
import { resolvePanelLayoutChrome } from "./panel-layout-chrome.js";
import { placeFacetPanels } from "./panel-layout-facet.js";
import { placeSinglePanel } from "./panel-layout-single.js";
import type { PanelLayoutResult, PanelPlacement } from "./panel-layout-types.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export type { PanelPlacement, PanelLayoutResult } from "./panel-layout-types.js";

export function computePanelLayout(input: {
  flip: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  allFrames: readonly LayerFrame[];
  labs: NonNullable<PortableSpec["labs"]>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  colorLegend: LegendInput | null;
  fillLegend: LegendInput | null;
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const { faceted, nrow, ncol, facetPanels, options } = input;

  const chrome = resolvePanelLayoutChrome(input);
  let placements: PanelPlacement[];

  if (faceted) {
    placements = placeFacetPanels({
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
  } else {
    const { h, v } = chrome.displayScales(0);
    placements = [
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
