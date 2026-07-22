import type { PanelCoordProjector } from "../coord-projector.js";
import type { GeometryBatch } from "../scene.js";

import { projectPathBatch } from "./coord-path-project.js";
import {
  MAX_COORD_VERTICES_PER_SUBPATH,
  projectPoint,
  tessellateSegment,
  unprojectPoint,
  type CoordTessellationBudget,
} from "./coord-tessellation.js";
import type { PipelineWarning } from "./types.js";

export type { CoordTessellationBudget } from "./coord-tessellation.js";
export { createCoordTessellationBudget } from "./coord-tessellation.js";

/** Project one completed geometry batch after stats, positions, and scale training. */
export function projectGeometryBatch(
  batch: GeometryBatch,
  projector: PanelCoordProjector,
  width: number,
  height: number,
  warnings: PipelineWarning[],
  sharedBudget?: CoordTessellationBudget,
): void {
  if (!projector.x.active && !projector.y.active) return;
  if (batch.kind === "paths") {
    projectPathBatch(batch, projector, width, height, warnings, sharedBudget);
    return;
  }
  if (batch.kind === "points" || batch.kind === "glyphs" || batch.kind === "rects") return;
  if (batch.kind === "segments") {
    const renderPositions: number[] = [];
    const renderPathOffsets: number[] = [0];
    const anchorPositions: number[] = [];
    let capped = false;
    for (let i = 0; i < batch.segments.length; i += 4) {
      const [sourceX1, sourceY1] = unprojectPoint(
        projector,
        width,
        height,
        batch.segments[i]!,
        batch.segments[i + 1]!,
      );
      const [sourceX2, sourceY2] = unprojectPoint(
        projector,
        width,
        height,
        batch.segments[i + 2]!,
        batch.segments[i + 3]!,
      );
      const [x1, y1] = projectPoint(projector, width, height, sourceX1, sourceY1);
      const [x2, y2] = projectPoint(projector, width, height, sourceX2, sourceY2);
      const [anchorX, anchorY] = projectPoint(
        projector,
        width,
        height,
        (sourceX1 + sourceX2) / 2,
        (sourceY1 + sourceY2) / 2,
      );
      batch.segments[i] = x1;
      batch.segments[i + 1] = y1;
      batch.segments[i + 2] = x2;
      batch.segments[i + 3] = y2;
      anchorPositions.push(anchorX, anchorY);
      renderPositions.push(x1, y1);
      const extraAvailable = Math.min(
        MAX_COORD_VERTICES_PER_SUBPATH - 2,
        sharedBudget?.extraRemaining ?? MAX_COORD_VERTICES_PER_SUBPATH - 2,
      );
      const budget = { remaining: 1 + extraAvailable, capped: false };
      const before = renderPositions.length / 2;
      tessellateSegment(
        projector,
        width,
        height,
        sourceX1,
        sourceY1,
        sourceX2,
        sourceY2,
        batch.rowIndex[i / 4] ?? 0xffffffff,
        i / 4,
        renderPositions,
        [],
        [],
        [],
        budget,
      );
      const extraUsed = Math.max(0, renderPositions.length / 2 - before - 1);
      if (sharedBudget !== undefined) sharedBudget.extraRemaining -= extraUsed;
      capped ||= budget.capped;
      renderPathOffsets.push(renderPositions.length / 2);
    }
    batch.renderPositions = Float32Array.from(renderPositions);
    batch.renderPathOffsets = Uint32Array.from(renderPathOffsets);
    batch.anchorPositions = Float32Array.from(anchorPositions);
    if (capped) {
      warnings.push({
        code: "coord-tessellation-cap",
        message: `Coordinate tessellation reached its deterministic vertex cap on layer ${batch.layerIndex}; rendered segment topology remains bounded.`,
      });
    }
  }
}
