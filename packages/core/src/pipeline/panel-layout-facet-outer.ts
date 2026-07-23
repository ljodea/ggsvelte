/**
 * Facet grid outer chrome: reserved title/legend bands and approximate cell size.
 */
import { PANEL_SPACING } from "../scene.js";

import type { FacetStripConfig } from "./facets-types.js";
import { isVerticalStrip } from "./facets-strip.js";
import { LEGEND_EDGE_PAD, LEGEND_GAP } from "./layout-helpers.js";

export interface FacetOuterChrome {
  spacing: number;
  strip: number;
  stripConfig: FacetStripConfig;
  outerLeft: number;
  outerBottom: number;
  outerRight: number;
  gridW: number;
  gridH: number;
  approxW: number;
  approxH: number;
}

export function computeFacetOuterChrome(input: {
  nrow: number;
  ncol: number;
  outerLeftTitle: string;
  outerBottomTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  legendBottomHeight: number;
  optionsWidth: number;
  layoutHeight: number;
  /** Measured strip band (0 when hidden). */
  stripBand: number;
  stripConfig: FacetStripConfig;
}): FacetOuterChrome {
  const {
    nrow,
    ncol,
    outerLeftTitle,
    outerBottomTitle,
    axisTitleBand,
    legendWidth,
    legendBottomHeight,
    optionsWidth,
    layoutHeight,
    stripBand,
    stripConfig,
  } = input;

  const spacing = PANEL_SPACING;
  const outerLeft = outerLeftTitle === "" ? 0 : axisTitleBand;
  const outerBottom =
    (outerBottomTitle === "" ? 0 : axisTitleBand) +
    (legendBottomHeight > 0 ? legendBottomHeight + LEGEND_GAP + LEGEND_EDGE_PAD : 0);
  const outerRight = legendWidth > 0 ? legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
  const gridW = Math.max(40, optionsWidth - outerLeft - outerRight);
  const gridH = Math.max(40, layoutHeight - outerBottom);
  const vertical = isVerticalStrip(stripConfig.position);
  // Top/bottom: strip height × rows. Left/right: strip width × columns.
  const stripH = vertical ? nrow * stripBand : 0;
  const stripW = vertical ? 0 : ncol * stripBand;
  const approxW = Math.max(40, (gridW - stripW - (ncol - 1) * spacing) / ncol);
  const approxH = Math.max(40, (gridH - stripH - (nrow - 1) * spacing) / nrow);

  return {
    spacing,
    strip: stripBand,
    stripConfig,
    outerLeft,
    outerBottom,
    outerRight,
    gridW,
    gridH,
    approxW,
    approxH,
  };
}
