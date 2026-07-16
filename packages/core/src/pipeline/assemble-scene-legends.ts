/**
 * Position scene legends relative to panel/chrome layout.
 */
import type { SceneLegend } from "../scene.js";

import { LEGEND_EDGE_PAD } from "./layout-helpers.js";

export function placeSceneLegends(input: {
  legends: readonly SceneLegend[];
  legendWidth: number;
  sceneWidth: number;
  panelY: number;
}): SceneLegend[] {
  const { legends, legendWidth, sceneWidth, panelY } = input;
  return legends.map((legend) => ({
    ...legend,
    x: legend.x + sceneWidth - legendWidth - LEGEND_EDGE_PAD,
    y: legend.y + panelY,
  }));
}
