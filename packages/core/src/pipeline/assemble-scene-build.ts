/**
 * Scene assembly from panel placements, axes, and legends.
 */
import type { GeometryBatch, Scene, SceneLegend } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import type { PositionScale } from "../scales/train.js";

import { placeSceneLegends } from "./assemble-scene-legends.js";
import { assembleScenePanels } from "./assemble-scene-panels.js";
import type { FacetPanelDef } from "./facets.js";
import type { PanelPlacement } from "./panel-layout.js";

export function assembleScene(input: {
  width: number;
  height: number;
  placements: readonly PanelPlacement[];
  facetPanels: readonly FacetPanelDef[];
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  hTitle: string;
  vTitle: string;
  batches: GeometryBatch[];
  legendBlock: { legends: SceneLegend[]; width: number };
  topBand: number;
  theme: ThemeTokens;
  title: string;
  subtitle: string;
  caption: string;
}): Scene {
  const {
    width,
    height,
    placements,
    facetPanels,
    displayScales,
    hTitle,
    vTitle,
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
    grid: scenePanels[0]?.grid ?? { x: [], y: [] },
    legends,
    theme,
    title,
    subtitle,
    caption,
  };
}
