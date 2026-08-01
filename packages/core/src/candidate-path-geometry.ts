import {
  pathSemanticNeighborRange,
  pathSubpathIndex,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import { MAX_DRAWN_EDGE_POINTS, drawnEdgeInto } from "./path-step.js";
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
  const subpath = pathSubpathIndex(batch.pathOffsets, start);
  const pad =
    (subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth)) / 2 +
    hitTolerance;
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

/**
 * Whether any drawn stroke in `range` crosses the query box. Walks the drawn
 * polyline so a stepped path brushes against its stairs, not the chord.
 */
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
  const drawn: number[] = Array.from({ length: MAX_DRAWN_EDGE_POINTS * 2 }, () => 0);
  for (let edge = range[0]; edge < range[1]; edge++) {
    const points = drawnEdgeInto(
      drawn,
      panelX + batch.positions[edge * 2]!,
      panelY + batch.positions[edge * 2 + 1]!,
      panelX + batch.positions[(edge + 1) * 2]!,
      panelY + batch.positions[(edge + 1) * 2 + 1]!,
      batch.curve,
    );
    for (let leg = 0; leg + 1 < points; leg++) {
      if (
        segmentIntersectsRect(
          drawn[leg * 2]!,
          drawn[leg * 2 + 1]!,
          drawn[(leg + 1) * 2]!,
          drawn[(leg + 1) * 2 + 1]!,
          loX,
          loY,
          hiX,
          hiY,
        )
      )
        return true;
    }
  }
  return false;
}

/**
 * First authored edge in `range` whose drawn stroke is within `slop` of (x,y).
 *
 * Walks the drawn polyline, not the chord between authored vertices, so a
 * stepped path hit-tests against the stairs the user sees.
 */
export function closestPathEdge(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  range: readonly [number, number] | null,
  x: number,
  y: number,
  slop: number,
): number {
  if (range === null) return Infinity;
  let closest = Infinity;
  const drawn: number[] = Array.from({ length: MAX_DRAWN_EDGE_POINTS * 2 }, () => 0);
  for (let edge = range[0]; edge < range[1]; edge++) {
    const points = drawnEdgeInto(
      drawn,
      batch.positions[edge * 2]!,
      batch.positions[edge * 2 + 1]!,
      batch.positions[(edge + 1) * 2]!,
      batch.positions[(edge + 1) * 2 + 1]!,
      batch.curve,
    );
    for (let leg = 0; leg + 1 < points; leg++) {
      if (
        segmentDistance(
          x,
          y,
          drawn[leg * 2]!,
          drawn[leg * 2 + 1]!,
          drawn[(leg + 1) * 2]!,
          drawn[(leg + 1) * 2 + 1]!,
        ) <= slop
      ) {
        closest = Math.min(closest, edge);
        break;
      }
    }
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
  const subpath = pathSubpathIndex(batch.pathOffsets, i);
  const pad =
    (subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth)) / 2 +
    hitTolerance;
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
