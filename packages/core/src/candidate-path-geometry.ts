import {
  pathSemanticNeighborRange,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import type { GeometryBatch } from "./scene.js";

/** Plot-space AABB for a path subpath range, padded by stroke half-width + hit tol. */
export function pathSubpathAabb(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panelX: number,
  panelY: number,
  start: number,
  end: number,
  fallbackX: number,
  fallbackY: number,
  hitTolerance: number,
): readonly [number, number, number, number] {
  const pad = batch.linewidth / 2 + hitTolerance;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let v = start; v < end; v++) {
    const px = panelX + batch.positions[v * 2]!;
    const py = panelY + batch.positions[v * 2 + 1]!;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  if (minX > maxX) return [fallbackX, fallbackY, fallbackX, fallbackY];
  return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}

export function pathSegmentsIntersectRect(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panelX: number,
  panelY: number,
  range: readonly [number, number],
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
): boolean {
  for (let edge = range[0]; edge < range[1]; edge++) {
    const x1 = panelX + batch.positions[edge * 2]!;
    const y1 = panelY + batch.positions[edge * 2 + 1]!;
    const x2 = panelX + batch.positions[(edge + 1) * 2]!;
    const y2 = panelY + batch.positions[(edge + 1) * 2 + 1]!;
    if (segmentIntersectsRect(x1, y1, x2, y2, loX, loY, hiX, hiY)) return true;
  }
  return false;
}

export function closestPathEdge(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  range: readonly [number, number] | null,
  x: number,
  y: number,
  slop: number,
): number {
  if (range === null) return Infinity;
  let closest = Infinity;
  for (let edge = range[0]; edge < range[1]; edge++) {
    if (
      segmentDistance(
        x,
        y,
        batch.positions[edge * 2]!,
        batch.positions[edge * 2 + 1]!,
        batch.positions[(edge + 1) * 2]!,
        batch.positions[(edge + 1) * 2 + 1]!,
      ) <= slop
    )
      closest = Math.min(closest, edge);
  }
  return closest;
}

/**
 * Plot-space AABB for the stroke segments incident on vertex `i` within
 * half-open subpath [start, end). Used for stroked (non-fill) path candidates
 * so one long series does not land every vertex in a plot-sized size class
 * (hit-index edge shortlist pattern). Pad = linewidth/2 + hit tol.
 */
export function pathVertexStrokeAabb(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panelX: number,
  panelY: number,
  i: number,
  start: number,
  end: number,
  hitTolerance: number,
): readonly [number, number, number, number] {
  const pad = batch.linewidth / 2 + hitTolerance;
  let minX = panelX + batch.positions[i * 2]!;
  let minY = panelY + batch.positions[i * 2 + 1]!;
  let maxX = minX;
  let maxY = minY;
  const semanticRange = pathSemanticNeighborRange(batch, i);
  const first = semanticRange?.[0] ?? Math.max(start, i - 1);
  const last = semanticRange?.[1] ?? Math.min(end - 1, i + 1);
  for (let other = first; other <= last; other++) {
    const ox = panelX + batch.positions[other * 2]!;
    const oy = panelY + batch.positions[other * 2 + 1]!;
    if (ox < minX) minX = ox;
    if (oy < minY) minY = oy;
    if (ox > maxX) maxX = ox;
    if (oy > maxY) maxY = oy;
  }
  return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}
