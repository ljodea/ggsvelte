/**
 * Facet col/row cursor placements and bottom-most-row index per column.
 */
import type { Margins } from "../layout/layout.js";

import type { FacetPanelDef } from "./facets.js";

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
    panelW,
    panelH,
  } = input;

  const colX: number[] = [];
  let xCursor = outerLeft;
  for (let c = 0; c < ncol; c++) {
    if (c === 0 || freeV) xCursor += mMax.left;
    colX.push(xCursor);
    xCursor += panelW + spacing;
  }
  const rowY: number[] = [];
  let yCursor = topBand + mMax.top;
  for (let r = 0; r < nrow; r++) {
    yCursor += strip;
    rowY.push(yCursor);
    yCursor += panelH;
    if (r === nrow - 1 || freeH) yCursor += mMax.bottom;
    yCursor += spacing;
  }

  const bottomMostRow: number[] = Array.from({ length: ncol }, () => 0);
  for (const def of facetPanels) {
    if (def.row > bottomMostRow[def.col]!) bottomMostRow[def.col] = def.row;
  }

  return { colX, rowY, bottomMostRow };
}
