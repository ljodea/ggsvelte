/**
 * Place one facet panel: tick layout pass + axis visibility flags.
 */
import type { LayoutTheme, Margins, PassResult, TickFormatter } from "../layout/layout.js";
import { layoutPass } from "../layout/layout.js";
import type { TextMeasurer } from "../layout/measure.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { layoutDomain } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export function placeOneFacetPanel(input: {
  def: FacetPanelDef;
  h: PositionScale;
  v: PositionScale;
  mMax: Margins;
  panelW: number;
  panelH: number;
  colX: number;
  rowY: number;
  freeH: boolean;
  freeV: boolean;
  bottomMostRow: number;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  measurer: TextMeasurer;
  layoutTheme: LayoutTheme;
}): PanelPlacement {
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
  return {
    x: colX,
    y: rowY,
    width: panelW,
    height: panelH,
    ticksH: ticksRun.x.ticks,
    ticksV: ticksRun.y.ticks,
    showAxisX: freeH || def.row === bottomMostRow,
    showAxisY: freeV || def.col === 0,
  };
}
