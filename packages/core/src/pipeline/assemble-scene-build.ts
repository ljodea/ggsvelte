/**
 * Scene assembly from panel placements, axes, and legends.
 */
import type { Scene } from "../scene.js";

import type { AssembleSceneInput } from "./assemble-scene-input.js";
import { placeSceneLegends } from "./assemble-scene-legends.js";
import { assembleScenePanels } from "./assemble-scene-panels.js";

export type { AssembleSceneInput } from "./assemble-scene-input.js";

export function assembleScene(input: AssembleSceneInput): Scene {
  const {
    width,
    height,
    placements,
    facetPanels,
    displayScales,
    hTitle,
    vTitle,
    coordProjectors,
    measureText,
    axisTextSize,
    hMinorBreaks,
    vMinorBreaks,
    batches,
    legendBlock,
    topBand,
    theme,
    title,
    subtitle,
    caption,
  } = input;

  const { scenePanels, xAxis, yAxis } = assembleScenePanels({
    placements,
    facetPanels,
    displayScales,
    hTitle,
    vTitle,
    coordProjectors,
    ...(measureText !== undefined && { measureText }),
    axisTextSize,
    ...(hMinorBreaks !== undefined && { hMinorBreaks }),
    ...(vMinorBreaks !== undefined && { vMinorBreaks }),
  });

  const legends = placeSceneLegends({
    legends: legendBlock.legends,
    legendWidth: legendBlock.width,
    sceneWidth: width,
    panelY: scenePanels[0]?.y ?? topBand,
  });

  return {
    width,
    height,
    panels: scenePanels,
    batches,
    axes: { x: xAxis, y: yAxis },
    grid: {
      x: scenePanels[0]?.grid.x ?? [],
      y: scenePanels[0]?.grid.y ?? [],
    },
    legends,
    theme,
    title,
    subtitle,
    caption,
  };
}
