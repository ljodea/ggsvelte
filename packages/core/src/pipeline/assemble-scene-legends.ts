/**
 * Position scene legends relative to panel/chrome layout.
 */
import type { SceneLegend } from "../scene.js";

import { LEGEND_EDGE_PAD } from "./layout-helpers.js";

export function containedRightLegendY(input: {
  legends: readonly SceneLegend[];
  panelY: number;
  minimumY: number;
  sceneHeight: number;
  bottomInset: number;
}): number {
  const rightExtent = input.legends.reduce(
    (extent, legend) =>
      legend.position === "right" ? Math.max(extent, legend.y + legend.height) : extent,
    0,
  );
  if (rightExtent === 0) return input.panelY;
  return Math.max(
    input.minimumY,
    Math.min(input.panelY, input.sceneHeight - input.bottomInset - rightExtent),
  );
}

export function placeSceneLegends(input: {
  legends: readonly SceneLegend[];
  legendWidth: number;
  sceneWidth: number;
  panelX: number;
  panelY: number;
  minimumY: number;
  sceneHeight: number;
  rightBottomInset: number;
  bottomLegendY: number;
}): SceneLegend[] {
  const { legends, legendWidth, sceneWidth, panelX, bottomLegendY } = input;
  const rightLegendY = containedRightLegendY({
    legends,
    panelY: input.panelY,
    minimumY: input.minimumY,
    sceneHeight: input.sceneHeight,
    bottomInset: input.rightBottomInset,
  });
  return legends.map((legend) => {
    const anchoredX =
      legend.position === "bottom" ? panelX : sceneWidth - legendWidth - LEGEND_EDGE_PAD;
    const containedX =
      legend.position === "bottom"
        ? Math.max(
            LEGEND_EDGE_PAD,
            Math.min(anchoredX, sceneWidth - legend.width - LEGEND_EDGE_PAD),
          )
        : anchoredX;
    return {
      ...legend,
      x: legend.x + containedX,
      y: legend.y + (legend.position === "bottom" ? bottomLegendY : rightLegendY),
    };
  });
}
