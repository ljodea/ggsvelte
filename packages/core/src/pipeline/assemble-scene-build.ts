/**
 * Scene assembly from panel placements, axes, and legends.
 */
import type { Scene, SceneTick } from "../scene.js";

import type { AssembleSceneInput } from "./assemble-scene-input.js";
import { placeSceneLegends } from "./assemble-scene-legends.js";
import { LEGEND_EDGE_PAD } from "./layout-helpers.js";
import { assembleScenePanels } from "./assemble-scene-panels.js";

export type { AssembleSceneInput } from "./assemble-scene-input.js";

function presentTicks(ticks: SceneTick[], guide: AssembleSceneInput["hGuide"]): SceneTick[] {
  return ticks.map((tick) => {
    const presented = { ...tick };
    if (guide.collision === "preserve") {
      presented.label = tick.fullLabel;
      delete presented.lines;
      delete presented.angle;
    }
    return {
      ...presented,
      showTick: guide.showTicks,
      showLabel: guide.showLabels,
      ...(guide.theme?.labelSize !== undefined && { labelSize: guide.theme.labelSize }),
    };
  });
}

export function assembleScene(input: AssembleSceneInput): Scene {
  const {
    width,
    height,
    placements,
    facetPanels,
    displayScales,
    hTitle,
    vTitle,
    hGuide,
    vGuide,
    coordProjectors,
    measureText,
    axisTextSize,
    hMinorBreaks,
    vMinorBreaks,
    batches,
    legendBlock,
    topBand,
    bottomBand,
    theme,
    title,
    subtitle,
    caption,
  } = input;

  // Tick chrome between gridBottom and the first x-label line, matching the SVG
  // renderer's own offset so a custom (longer/hidden) tick theme keeps the
  // band-label axis title clear of the labels.
  const tickChromePx = (theme.ticksX ? theme.tickLength : 0) + 3;
  const { scenePanels, xAxis, yAxis } = assembleScenePanels({
    placements,
    facetPanels,
    displayScales,
    hTitle,
    vTitle,
    coordProjectors,
    ...(measureText !== undefined && { measureText }),
    axisTextSize,
    tickChromePx,
    ...(hMinorBreaks !== undefined && { hMinorBreaks }),
    ...(vMinorBreaks !== undefined && { vMinorBreaks }),
  });

  for (const panel of scenePanels) {
    if (!hGuide.visible) panel.axisX = null;
    else if (panel.axisX !== null) panel.axisX = presentTicks(panel.axisX, hGuide);
    if (!vGuide.visible) panel.axisY = null;
    else if (panel.axisY !== null) panel.axisY = presentTicks(panel.axisY, vGuide);
  }
  if (hGuide.theme?.titleSize !== undefined) xAxis.titleSize = hGuide.theme.titleSize;
  if (vGuide.theme?.titleSize !== undefined) yAxis.titleSize = vGuide.theme.titleSize;
  xAxis.ticks = hGuide.visible ? presentTicks(xAxis.ticks, hGuide) : [];
  yAxis.ticks = vGuide.visible ? presentTicks(yAxis.ticks, vGuide) : [];

  const panelX = scenePanels.length === 0 ? 0 : Math.min(...scenePanels.map((panel) => panel.x));
  const panelY =
    scenePanels.length === 0 ? topBand : Math.min(...scenePanels.map((panel) => panel.y));
  const legends = placeSceneLegends({
    legends: legendBlock.legends,
    legendWidth: legendBlock.width,
    sceneWidth: width,
    panelX,
    panelY,
    bottomLegendY: height - bottomBand - LEGEND_EDGE_PAD - legendBlock.bottomHeight,
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
