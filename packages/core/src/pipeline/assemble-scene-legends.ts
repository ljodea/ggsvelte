/**
 * Position scene legends relative to panel/chrome layout.
 */
import type { SceneLegend } from "../scene.js";

import { LEGEND_EDGE_PAD } from "./layout-helpers.js";

export function placeSceneLegends(input: {
  legends: readonly SceneLegend[];
  legendWidth: number;
  sceneWidth: number;
  panelX: number;
  panelY: number;
  bottomLegendY: number;
}): SceneLegend[] {
  const { legends, legendWidth, sceneWidth, panelX, panelY, bottomLegendY } = input;
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
      y: legend.y + (legend.position === "bottom" ? bottomLegendY : panelY),
    };
  });
}
