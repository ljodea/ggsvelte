/**
 * Facet panel width/height from grid extents and shared margins.
 */
import type { Margins } from "../layout/layout.js";

import { DEFAULT_FACET_STRIP, type FacetStripConfig } from "./facets-types.js";
import { isVerticalStrip } from "./facets-strip.js";

export function computeFacetPanelSize(input: {
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  mMax: Margins;
  spacing: number;
  strip: number;
  stripConfig?: FacetStripConfig;
  gridW: number;
  gridH: number;
}): { panelW: number; panelH: number } {
  const {
    nrow,
    ncol,
    freeH,
    freeV,
    mMax,
    spacing,
    strip,
    stripConfig = DEFAULT_FACET_STRIP,
    gridW,
    gridH,
  } = input;
  const leftCount = freeV ? ncol : 1;
  const bottomCount = freeH ? nrow : 1;
  const vertical = isVerticalStrip(stripConfig.position);
  const stripW = vertical ? 0 : ncol * strip;
  const stripH = vertical ? nrow * strip : 0;
  const panelW = Math.max(
    1,
    (gridW - leftCount * mMax.left - mMax.right - stripW - (ncol - 1) * spacing) / ncol,
  );
  const panelH = Math.max(
    1,
    (gridH - mMax.top - bottomCount * mMax.bottom - stripH - (nrow - 1) * spacing) / nrow,
  );
  return { panelW, panelH };
}
