/**
 * Geometry batch construction and Scene assembly from panel placements.
 */
import type { GeometryBatch, Scene, SceneAxis, SceneLegend, ScenePanel } from "../scene.js";
import type { ThemeTokens } from "../theme.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { buildBatch, flipBatchInPlace } from "./geometry.js";
import type { Frame } from "./geometry.js";
import { axisTicks, LEGEND_EDGE_PAD } from "./layout-helpers.js";
import type { PanelPlacement } from "./panel-layout.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";

export function buildGeometryBatches(input: {
  layerCount: number;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  placements: readonly PanelPlacement[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  flip: boolean;
  warnings: PipelineWarning[];
}): GeometryBatch[] {
  const {
    layerCount,
    facetPanels,
    panelFrames,
    placements,
    panelScales,
    color,
    fill,
    flip,
    warnings,
  } = input;
  const batches: GeometryBatch[] = [];
  const panelFrame = (p: number): Frame => {
    const placement = placements[p]!;
    const scales = panelScales[p]!;
    return flip
      ? {
          innerWidth: placement.height,
          innerHeight: placement.width,
          xScale: scales.x,
          yScale: scales.y,
        }
      : {
          innerWidth: placement.width,
          innerHeight: placement.height,
          xScale: scales.x,
          yScale: scales.y,
        };
  };
  for (let index = 0; index < layerCount; index++) {
    for (let p = 0; p < facetPanels.length; p++) {
      const frame = panelFrames[p]?.[index];
      if (frame === undefined) continue;
      const placement = placements[p]!;
      const built = buildBatch(frame, panelFrame(p), color, fill, warnings);
      for (const batch of built) {
        if (flip) flipBatchInPlace(batch, placement.width, placement.height);
        batch.panelIndex = p;
        batches.push(batch);
      }
    }
  }
  return batches;
}

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

  const scenePanels: ScenePanel[] = placements.map((placement, p) => {
    const { h, v } = displayScales(p);
    const bottom = axisTicks(h, placement.ticksH, placement.width, false);
    const left = axisTicks(v, placement.ticksV, placement.height, true);
    return {
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

  const legends: SceneLegend[] = legendBlock.legends.map((legend) => ({
    ...legend,
    x: legend.x + width - legendBlock.width - LEGEND_EDGE_PAD,
    y: legend.y + (scenePanels[0]?.y ?? topBand),
  }));

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
