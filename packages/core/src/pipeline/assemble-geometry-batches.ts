/**
 * Layer-major geometry batch construction across facet panels.
 */
import type { GeometryBatch } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { buildBatch, flipBatchInPlace } from "./geometry.js";
import type { Frame } from "./geometry.js";
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
