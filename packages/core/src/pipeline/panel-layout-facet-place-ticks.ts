/**
 * Facet panel tick layout pass and placement packing.
 */
import { layoutPass } from "../layout/layout.js";

import { layoutDomain } from "./layout-helpers.js";
import { packFacetPanelPlacement } from "./panel-layout-facet-place-pack.js";
import type { FacetPanelTicksInput } from "./panel-layout-facet-place-ticks-input.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export type { FacetPanelTicksInput } from "./panel-layout-facet-place-ticks-input.js";

export function placeFacetPanelFromTicks(input: FacetPanelTicksInput): PanelPlacement {
  const {
    def,
    h,
    v,
    mMax,
    panelW,
    panelH,
    colX,
    rowY,
    freeH,
    freeV,
    bottomMostRow,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  const ticksRun = layoutPass(
    mMax,
    {
      width: panelW + mMax.left + mMax.right,
      height: panelH + mMax.top + mMax.bottom,
      x: layoutDomain(h, hBreaks),
      y: layoutDomain(v, vBreaks),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
    },
    layoutTheme,
  );
  return packFacetPanelPlacement({
    def,
    colX,
    rowY,
    panelW,
    panelH,
    freeH,
    freeV,
    bottomMostRow,
    ticksRun,
  });
}
