/**
 * Map facet panel defs through geometry into placements.
 */
import type { LayoutTheme, Margins, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import { placeOneFacetPanel } from "./panel-layout-facet-place-one.js";
import type { DisplayScalesFn, PanelPlacement } from "./panel-layout-types.js";

export function mapFacetPanelPlacements(input: {
  facetPanels: readonly FacetPanelDef[];
  freeH: boolean;
  freeV: boolean;
  displayScales: DisplayScalesFn;
  mMax: Margins;
  panelW: number;
  panelH: number;
  colX: number[];
  rowY: number[];
  bottomMostRow: number[];
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}): PanelPlacement[] {
  const {
    facetPanels,
    freeH,
    freeV,
    displayScales,
    mMax,
    panelW,
    panelH,
    colX,
    rowY,
    bottomMostRow,
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  return facetPanels.map((def, p) => {
    const { h, v } = displayScales(p);
    return placeOneFacetPanel({
      def,
      h,
      v,
      mMax,
      panelW,
      panelH,
      colX: colX[def.col]!,
      rowY: rowY[def.row]!,
      freeH,
      freeV,
      bottomMostRow: bottomMostRow[def.col]!,
      hBreaks,
      vBreaks,
      formatH,
      formatV,
      measurer,
      layoutTheme,
    });
  });
}
