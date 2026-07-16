/**
 * Build ScenePanel[] and shared axis ticks from placements.
 */
import type { SceneAxis, ScenePanel } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { axisTicks } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout.js";

export function assembleScenePanels(input: {
  placements: readonly PanelPlacement[];
  facetPanels: readonly FacetPanelDef[];
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
  hTitle: string;
  vTitle: string;
}): {
  scenePanels: ScenePanel[];
  xAxis: SceneAxis;
  yAxis: SceneAxis;
} {
  const { placements, facetPanels, displayScales, hTitle, vTitle } = input;

  const scenePanels: ScenePanel[] = placements.map((placement, p) => {
    const { h, v } = displayScales(p);
    const bottom = axisTicks(h, placement.ticksH, placement.width, false);
    const left = axisTicks(v, placement.ticksV, placement.height, true);
    return {
      identity: facetPanels[p]!.identity,
      id: facetPanels[p]!.id,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      strip: facetPanels[p]!.label,
      axisX: placement.showAxisX ? bottom : null,
      axisY: placement.showAxisY ? left : null,
      grid: { x: bottom.map((t) => t.pos), y: left.map((t) => t.pos) },
    };
  });

  const firstX = scenePanels.find((p) => p.axisX !== null);
  const firstY = scenePanels.find((p) => p.axisY !== null);
  const xAxis: SceneAxis = { ticks: firstX?.axisX ?? [], title: hTitle };
  const yAxis: SceneAxis = { ticks: firstY?.axisY ?? [], title: vTitle };

  return { scenePanels, xAxis, yAxis };
}
