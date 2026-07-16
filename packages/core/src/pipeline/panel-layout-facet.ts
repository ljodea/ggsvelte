/**
 * Facet-grid panel placement: shared margin pass, free-scale edge axes, strips.
 */
import type { LayoutTheme, TickFormatter } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import { computeFacetGridGeometry } from "./panel-layout-facet-margins.js";
import { placeOneFacetPanel } from "./panel-layout-facet-place-one.js";
import type { DisplayScalesFn, PanelPlacement } from "./panel-layout-types.js";

export function placeFacetPanels(input: {
  facetPanels: readonly FacetPanelDef[];
  nrow: number;
  ncol: number;
  freeH: boolean;
  freeV: boolean;
  outerLeftTitle: string;
  outerBottomTitle: string;
  axisTitleBand: number;
  legendWidth: number;
  optionsWidth: number;
  layoutHeight: number;
  topBand: number;
  displayScales: DisplayScalesFn;
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
    hBreaks,
    vBreaks,
    formatH,
    formatV,
    measurer,
    layoutTheme,
  } = input;

  const { mMax, panelW, panelH, colX, rowY, bottomMostRow } = computeFacetGridGeometry(input);

  const placements: PanelPlacement[] = [];
  for (let p = 0; p < facetPanels.length; p++) {
    const def = facetPanels[p]!;
    const { h, v } = displayScales(p);
    placements.push(
      placeOneFacetPanel({
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
      }),
    );
  }
  return placements;
}
