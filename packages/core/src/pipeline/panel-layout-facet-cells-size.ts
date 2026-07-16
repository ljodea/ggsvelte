/**
 * Facet panel width/height from grid extents and shared margins.
 */
import type { Margins } from "../layout/layout.js";

export function computeFacetPanelSize(input: {
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  spacing: number;
  strip: number;
  gridW: number;
  gridH: number;
}): { panelW: number; panelH: number } {
  const { nrow, ncol, freeH, freeV, mMax, spacing, strip, gridW, gridH } = input;
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
  return { panelW, panelH };
}
