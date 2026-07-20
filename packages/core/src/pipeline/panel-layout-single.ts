/**
 * Single-panel layout placement with axis-title and legend reserves.
 */
import type { LayoutTheme, TemporalLayoutDomainContext, TickFormatter } from "../layout/layout.js";
import { layout } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { PositionScale } from "../scales/train.js";

import { layoutDomain } from "./layout-helpers.js";
import { singlePanelPlacementFromLayout } from "./panel-layout-single-from-layout.js";
import { singlePanelMarginReserve } from "./panel-layout-single-reserve.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export function placeSinglePanel(input: {
  h: PositionScale;
  v: PositionScale;
  hTemporal?: TemporalLayoutDomainContext;
  vTemporal?: TemporalLayoutDomainContext;
  hTitle: string;
  vTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}): PanelPlacement {
  const {
    h,
    v,
    hTemporal,
    vTemporal,
    hTitle,
    vTitle,
    axisTitleBand,
    legendWidth,
    optionsWidth,
    layoutHeight,
    topBand,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  const layoutResult = layout({
    width: optionsWidth,
    height: layoutHeight,
    x: layoutDomain(h, hBreaks, hTemporal),
    y: layoutDomain(v, vBreaks, vTemporal),
    ...(formatH !== undefined && { formatX: formatH }),
    ...(formatV !== undefined && { formatY: formatV }),
    measurer,
    reserve: singlePanelMarginReserve(hTitle, vTitle, axisTitleBand, legendWidth),
    theme: layoutTheme,
  });
  return singlePanelPlacementFromLayout(layoutResult, optionsWidth, layoutHeight, topBand);
}
