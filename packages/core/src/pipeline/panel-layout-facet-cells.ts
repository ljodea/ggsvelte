/**
 * Facet grid cell sizes and absolute col/row placements.
 */
import type { Margins } from "../layout/layout.js";

import type { FacetPanelDef } from "./facets.js";

export interface FacetCellGeometry {
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
}

export function computeFacetCellGeometry(input: {
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
  gridW: number;
  gridH: number;
}): FacetCellGeometry {
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
    gridW,
    gridH,
  } = input;

  const leftCount = freeV ? ncol : 1;
  const bottomCount = freeH ? nrow : 1;
  const panelW = Math.max(
    1,
    (gridW - leftCount * mMax.left - mMax.right - (ncol - 1) * spacing) / ncol,
  );
  const panelH = Math.max(
    1,
    (gridH - mMax.top - bottomCount * mMax.bottom - nrow * strip - (nrow - 1) * spacing) / nrow,
  );

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

  return { panelW, panelH, colX, rowY, bottomMostRow };
}
