/**
 * Facet-grid panel placement: shared margin pass, free-scale edge axes, strips.
 */
import type { LayoutTheme, PassResult, TickFormatter } from "../layout/layout.js";
import { layoutPass } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef } from "./facets.js";
import { layoutDomain } from "./layout-helpers.js";
import { computeFacetGridGeometry } from "./panel-layout-facet-margins.js";
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
    const ticksRun: PassResult = layoutPass(
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
    placements.push({
      x: colX[def.col]!,
      y: rowY[def.row]!,
      width: panelW,
      height: panelH,
      ticksH: ticksRun.x.ticks,
      ticksV: ticksRun.y.ticks,
      showAxisX: freeH || def.row === bottomMostRow[def.col]!,
      showAxisY: freeV || def.col === 0,
    });
  }
  return placements;
}
