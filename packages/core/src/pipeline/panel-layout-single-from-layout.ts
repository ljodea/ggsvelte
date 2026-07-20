/**
 * Pack single-panel placement from a layout() result.
 */
import type { LayoutResult } from "../layout/layout.js";

import type { PanelPlacement } from "./panel-layout-types.js";

export function singlePanelPlacementFromLayout(
  layoutResult: LayoutResult,
  optionsWidth: number,
  layoutHeight: number,
  topBand: number,
): PanelPlacement {
  const margins = layoutResult.margins;
  return {
    x: margins.left,
    y: topBand + margins.top,
    width: Math.max(1, optionsWidth - margins.left - margins.right),
    height: Math.max(1, layoutHeight - margins.top - margins.bottom),
    ticksH: layoutResult.x.ticks,
    ticksV: layoutResult.y.ticks,
    ...(layoutResult.x.guidePlan !== undefined && { hGuidePlan: layoutResult.x.guidePlan }),
    ...(layoutResult.y.guidePlan !== undefined && { vGuidePlan: layoutResult.y.guidePlan }),
    showAxisX: true,
    showAxisY: true,
  };
}
