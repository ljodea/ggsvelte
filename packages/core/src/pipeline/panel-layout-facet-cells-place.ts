/**
 * Facet col/row cursor placements and bottom-most-row index per column.
 */
import type { Margins } from "../layout/layout.js";

import { DEFAULT_FACET_STRIP, type FacetPanelDef, type FacetStripConfig } from "./facets.js";

export function computeFacetColRowPlacements(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  outerLeft: number;
  topBand: number;
  spacing: number;
  strip: number;
  stripConfig?: FacetStripConfig;
  panelW: number;
  panelH: number;
}): { colX: number[]; rowY: number[]; bottomMostRow: number[] } {
  const {
    facetPanels,
    nrow,
    ncol,
    freeH,
    freeV,
    mMax,
    outerLeft,
    topBand,
    spacing,
    strip,
    stripConfig = DEFAULT_FACET_STRIP,
    panelW,
    panelH,
  } = input;

  // Strip placement relative to axis margins (ggplot-style):
  // - left:  [strip][y-axis margin][panel]
  // - right: [panel][strip]  (y-axis stays on left)
  // - top:   [strip][panel]  (x-axis stays on bottom)
  // - bottom:[panel][x-axis margin][strip]
  const colX: number[] = [];
  let xCursor = outerLeft;
  for (let c = 0; c < ncol; c++) {
    if (stripConfig.position === "left") xCursor += strip;
    if (c === 0 || freeV) xCursor += mMax.left;
    colX.push(xCursor);
    xCursor += panelW;
    if (stripConfig.position === "right") xCursor += strip;
    xCursor += spacing;
  }

  const rowY: number[] = [];
  let yCursor = topBand + mMax.top;
  for (let r = 0; r < nrow; r++) {
    if (stripConfig.position === "top") yCursor += strip;
    rowY.push(yCursor);
    yCursor += panelH;
    if (r === nrow - 1 || freeH) yCursor += mMax.bottom;
    if (stripConfig.position === "bottom") yCursor += strip;
    yCursor += spacing;
  }

  const bottomMostRow: number[] = Array.from({ length: ncol }, () => 0);
  for (const def of facetPanels) {
    if (def.row > bottomMostRow[def.col]!) bottomMostRow[def.col] = def.row;
  }

  return { colX, rowY, bottomMostRow };
}
