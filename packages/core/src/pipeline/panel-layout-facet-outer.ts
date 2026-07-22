/**
 * Facet grid outer chrome: reserved title/legend bands and approximate cell size.
 */
import { PANEL_SPACING, STRIP_BAND } from "../scene.js";

import { LEGEND_EDGE_PAD, LEGEND_GAP } from "./layout-helpers.js";

export interface FacetOuterChrome {
  spacing: number;
  strip: number;
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
  } = input;

  const spacing = PANEL_SPACING;
  const strip = STRIP_BAND;
  const outerLeft = outerLeftTitle === "" ? 0 : axisTitleBand;
  const outerBottom =
    (outerBottomTitle === "" ? 0 : axisTitleBand) +
    (legendBottomHeight > 0 ? legendBottomHeight + LEGEND_GAP + LEGEND_EDGE_PAD : 0);
  const outerRight = legendWidth > 0 ? legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
  const gridW = Math.max(40, optionsWidth - outerLeft - outerRight);
  const gridH = Math.max(40, layoutHeight - outerBottom);
  const approxW = Math.max(40, (gridW - (ncol - 1) * spacing) / ncol);
  const approxH = Math.max(40, (gridH - nrow * strip - (nrow - 1) * spacing) / nrow);

  return {
    spacing,
    strip,
    outerLeft,
    outerBottom,
    outerRight,
    gridW,
    gridH,
    approxW,
    approxH,
  };
}
