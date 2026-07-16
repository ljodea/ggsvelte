/**
 * Single-panel layout placement with axis-title and legend reserves.
 */
import type { LayoutTheme, Margins, TickFormatter } from "../layout/layout.js";
import { layout } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { PositionScale } from "../scales/train.js";

import { LEGEND_EDGE_PAD, LEGEND_GAP, layoutDomain } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export function placeSinglePanel(input: {
  h: PositionScale;
  v: PositionScale;
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

  const reserve: Partial<Margins> = {
    ...(hTitle !== "" && { bottom: axisTitleBand }),
    ...(vTitle !== "" && { left: axisTitleBand }),
    ...(legendWidth > 0 && { right: legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD }),
  };
  const layoutResult = layout({
    width: optionsWidth,
    height: layoutHeight,
    x: layoutDomain(h, hBreaks),
    y: layoutDomain(v, vBreaks),
    ...(formatH !== undefined && { formatX: formatH }),
    ...(formatV !== undefined && { formatY: formatV }),
    measurer,
    reserve,
    theme: layoutTheme,
  });
  const margins = layoutResult.margins;
  return {
    x: margins.left,
    y: topBand + margins.top,
    width: Math.max(1, optionsWidth - margins.left - margins.right),
    height: Math.max(1, layoutHeight - margins.top - margins.bottom),
    ticksH: layoutResult.x.ticks,
    ticksV: layoutResult.y.ticks,
    showAxisX: true,
    showAxisY: true,
  };
}
