/**
 * Pack a PanelPlacement from tick-pass results and facet geometry.
 */
import type { PassResult } from "../layout/layout.js";

import type { FacetPanelDef } from "./facets.js";
import type { PanelPlacement } from "./panel-layout-types.js";

export function packFacetPanelPlacement(input: {
  def: FacetPanelDef;
  colX: number;
  rowY: number;
  panelW: number;
  panelH: number;
  freeH: boolean;
  freeV: boolean;
  bottomMostRow: number;
  ticksRun: PassResult;
}): PanelPlacement {
  const { def, colX, rowY, panelW, panelH, freeH, freeV, bottomMostRow, ticksRun } = input;
  return {
    x: colX,
    y: rowY,
    width: panelW,
    height: panelH,
    ticksH: ticksRun.x.ticks,
    ticksV: ticksRun.y.ticks,
    ...(ticksRun.x.guidePlan !== undefined && { hGuidePlan: ticksRun.x.guidePlan }),
    ...(ticksRun.y.guidePlan !== undefined && { vGuidePlan: ticksRun.y.guidePlan }),
    showAxisX: freeH || def.row === bottomMostRow,
    showAxisY: freeV || def.col === 0,
  };
}
