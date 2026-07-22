/**
 * Layer-major geometry batch construction across facet panels.
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { GeometryBatch } from "../scene.js";
import type { PositionScale } from "../scales/train.js";

import { geometryPanelFrame } from "./assemble-geometry-panel-frame.js";
import { createCoordTessellationBudget, projectGeometryBatch } from "./coord-geometry.js";
import type { FacetPanelDef } from "./facets.js";
import { buildBatch, flipBatchInPlace } from "./geometry.js";
import type { PanelPlacement } from "./panel-layout.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";

export function buildGeometryBatches(input: {
  layerCount: number;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  placements: readonly PanelPlacement[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  styles: ResolvedStyleScales;
  flip: boolean;
  coordProjectors: readonly PanelCoordProjector[];
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
    styles,
    flip,
    coordProjectors,
    warnings,
  } = input;
  const batches: GeometryBatch[] = [];
  for (let index = 0; index < layerCount; index++) {
    for (let p = 0; p < facetPanels.length; p++) {
      const frame = panelFrames[p]?.[index];
      if (frame === undefined) continue;
      const placement = placements[p]!;
      const projector = coordProjectors[p];
      const geom = frame.binding.layer.geom;
      const pathLike =
        geom === "line" || geom === "area" || geom === "density" || geom === "smooth";
      const built = buildBatch(
        frame,
        // Path topology must retain coordinate-invalid authored/stat vertices
        // until the post-stat projector can split finite runs without bridging.
        geometryPanelFrame(placement, panelScales[p]!, flip, pathLike ? undefined : projector),
        color,
        fill,
        styles,
        warnings,
      );
      const tessellationBudget = createCoordTessellationBudget(built);
      for (const batch of built) {
        if (flip) flipBatchInPlace(batch, placement.width, placement.height);
        if (projector !== undefined) {
          projectGeometryBatch(
            batch,
            projector,
            placement.width,
            placement.height,
            warnings,
            tessellationBudget,
          );
        }
        batch.panelIndex = p;
        batches.push(batch);
      }
    }
  }
  return batches;
}
