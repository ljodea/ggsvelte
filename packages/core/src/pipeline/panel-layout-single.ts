/**
 * Single-panel layout placement with axis-title and legend reserves.
 */
import type {
  BandLayoutDomainContext,
  LayoutAxisPresentation,
  LayoutTheme,
  TemporalLayoutDomainContext,
  TickFormatter,
} from "../layout/layout.js";
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
  hBand?: BandLayoutDomainContext;
  vBand?: BandLayoutDomainContext;
  hTitle: string;
  vTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  legendBottomHeight: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
  axis: Readonly<{ x: LayoutAxisPresentation; y: LayoutAxisPresentation }>;
}): PanelPlacement {
  const {
    h,
    v,
    hTemporal,
    vTemporal,
    hBand,
    vBand,
    hTitle,
    vTitle,
    axisTitleBand,
    legendWidth,
    legendBottomHeight,
    optionsWidth,
    layoutHeight,
    topBand,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
    axis,
  } = input;

  const layoutResult = layout({
    width: optionsWidth,
    height: layoutHeight,
    x: layoutDomain(h, hBreaks, hTemporal, hBand),
    y: layoutDomain(v, vBreaks, vTemporal, vBand),
    ...(formatH !== undefined && { formatX: formatH }),
    ...(formatV !== undefined && { formatY: formatV }),
    measurer,
    axis,
    reserve: singlePanelMarginReserve(
      hTitle,
      vTitle,
      axisTitleBand,
      legendWidth,
      legendBottomHeight,
    ),
    theme: layoutTheme,
  });
  return singlePanelPlacementFromLayout(layoutResult, optionsWidth, layoutHeight, topBand);
}
