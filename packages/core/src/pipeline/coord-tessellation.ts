import type { PanelCoordProjector } from "../coord-projector.js";
import { segmentDistance } from "../candidate-geometry.js";
import type { GeometryBatch } from "../scene.js";

const COORD_TESSELLATION_TOLERANCE_PX = 0.5;
const MAX_COORD_TESSELLATION_DEPTH = 12;
export const MAX_COORD_VERTICES_PER_SUBPATH = 4096;
export const MAX_COORD_VERTICES_PER_PANEL_LAYER = 65_536;

export interface CoordTessellationBudget {
  extraRemaining: number;
  mandatoryVertices: number;
}

export function createCoordTessellationBudget(
  batches: readonly GeometryBatch[],
): CoordTessellationBudget {
  let mandatoryVertices = 0;
  for (const batch of batches) {
    if (batch.kind === "paths") mandatoryVertices += batch.positions.length / 2;
    else if (batch.kind === "segments") mandatoryVertices += batch.segments.length / 2;
  }
  return {
    mandatoryVertices,
    extraRemaining: Math.max(0, MAX_COORD_VERTICES_PER_PANEL_LAYER - mandatoryVertices),
  };
}

export function projectPoint(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x: number,
  y: number,
): readonly [number, number] {
  const tx = projector.x.projectFraction(x / width);
  const ty = projector.y.projectFraction(1 - y / height);
  return [tx * width, (1 - ty) * height];
}

export function unprojectPoint(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x: number,
  y: number,
): readonly [number, number] {
  const tx = projector.x.invertFraction(x / width);
  const ty = projector.y.invertFraction(1 - y / height);
  return [tx * width, (1 - ty) * height];
}

export function tessellateSegment(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  row: number,
  semanticIndex: number,
  out: number[],
  rows: number[],
  anchors: number[],
  indices: number[],
  budget: { remaining: number; capped: boolean },
  depth = 0,
): void {
  const [px0, py0] = projectPoint(projector, width, height, x0, y0);
  const [px1, py1] = projectPoint(projector, width, height, x1, y1);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const [pmx, pmy] = projectPoint(projector, width, height, mx, my);
  const error = segmentDistance(pmx, pmy, px0, py0, px1, py1);
  if (
    depth < MAX_COORD_TESSELLATION_DEPTH &&
    error > COORD_TESSELLATION_TOLERANCE_PX &&
    budget.remaining > 1
  ) {
    // Split remaining so the left half cannot starve the true endpoint, then
    // reallocate any unused left capacity to the right for uneven curvature.
    const leftRemaining = Math.floor(budget.remaining / 2);
    const rightRemaining = budget.remaining - leftRemaining;
    const left = { remaining: leftRemaining, capped: false };
    tessellateSegment(
      projector,
      width,
      height,
      x0,
      y0,
      mx,
      my,
      row,
      semanticIndex,
      out,
      rows,
      anchors,
      indices,
      left,
      depth + 1,
    );
    const right = { remaining: rightRemaining + left.remaining, capped: false };
    tessellateSegment(
      projector,
      width,
      height,
      mx,
      my,
      x1,
      y1,
      row,
      semanticIndex,
      out,
      rows,
      anchors,
      indices,
      right,
      depth + 1,
    );
    budget.remaining = right.remaining;
    budget.capped ||= left.capped || right.capped;
    return;
  }
  if (
    error > COORD_TESSELLATION_TOLERANCE_PX &&
    (budget.remaining <= 1 || depth >= MAX_COORD_TESSELLATION_DEPTH)
  )
    budget.capped = true;
  if (budget.remaining <= 0) return;
  out.push(px1, py1);
  rows.push(row);
  anchors.push(0);
  indices.push(semanticIndex);
  budget.remaining--;
}
