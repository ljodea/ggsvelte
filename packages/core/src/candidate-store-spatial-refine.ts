/**
 * Per-id geometry refine for candidate hit testing (distance + rect intersect).
 * Independent of the spatial shortlist index bag.
 */
import {
  insidePath,
  pathRange,
  pathSemanticNeighborRange,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import { pathSegmentsIntersectRect } from "./candidate-path-geometry.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";

export type SpatialRefine = {
  exactDistance(
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  intersects(id: number, loX: number, loY: number, hiX: number, hiY: number): boolean;
};

/** Build exactDistance / intersects closed over store indexes. */
export function createSpatialRefine(indexes: CandidateStoreIndexes): SpatialRefine {
  const { scene, hitTolerance, batchIds, primitiveIds, panelIds, xs, ys } = indexes;

  const exactDistance = (
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null => {
    const batch = scene.batches[batchIds[id]!]!;
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    const x = px - panel.x;
    const y = py - panel.y;
    if (batch.kind === "points") {
      const d = Math.hypot(px - xs[id]!, py - ys[id]!);
      return d <= batch.size + hitTolerance ? d : null;
    }
    if (batch.kind === "rects") {
      const rx = batch.rects[i * 4]!;
      const ry = batch.rects[i * 4 + 1]!;
      const rw = batch.rects[i * 4 + 2]!;
      const rh = batch.rects[i * 4 + 3]!;
      return x >= Math.min(rx, rx + rw) &&
        x <= Math.max(rx, rx + rw) &&
        y >= Math.min(ry, ry + rh) &&
        y <= Math.max(ry, ry + rh)
        ? 0
        : null;
    }
    if (batch.kind === "segments") {
      let d = Infinity;
      const renderStart = batch.renderPathOffsets?.[i];
      const renderEnd = batch.renderPathOffsets?.[i + 1];
      if (
        batch.renderPositions !== undefined &&
        renderStart !== undefined &&
        renderEnd !== undefined
      ) {
        for (let edge = renderStart; edge + 1 < renderEnd; edge++) {
          d = Math.min(
            d,
            segmentDistance(
              x,
              y,
              batch.renderPositions[edge * 2]!,
              batch.renderPositions[edge * 2 + 1]!,
              batch.renderPositions[(edge + 1) * 2]!,
              batch.renderPositions[(edge + 1) * 2 + 1]!,
            ),
          );
        }
      } else {
        d = segmentDistance(
          x,
          y,
          batch.segments[i * 4]!,
          batch.segments[i * 4 + 1]!,
          batch.segments[i * 4 + 2]!,
          batch.segments[i * 4 + 3]!,
        );
      }
      return d <= batch.linewidth / 2 + hitTolerance ? d : null;
    }
    if (batch.kind === "paths") {
      // One O(log P) range lookup; reuse for fill containment and stroke neighbors.
      const range = pathRange(batch, i);
      if (batch.fills !== undefined && range !== null) {
        const containmentKey = `${batchIds[id]}:${range[0]}:${range[1]}`;
        let contained = pathContainment.get(containmentKey);
        if (contained === undefined) {
          contained = insidePath(batch, range[0], range[1], x, y);
          pathContainment.set(containmentKey, contained);
        }
        if (contained) return Math.hypot(px - xs[id]!, py - ys[id]!);
        return null;
      }
      let d = Infinity;
      const semanticRange = pathSemanticNeighborRange(batch, i);
      if (range !== null && semanticRange !== null) {
        for (let edge = semanticRange[0]; edge < semanticRange[1]; edge++) {
          d = Math.min(
            d,
            segmentDistance(
              x,
              y,
              batch.positions[edge * 2]!,
              batch.positions[edge * 2 + 1]!,
              batch.positions[(edge + 1) * 2]!,
              batch.positions[(edge + 1) * 2 + 1]!,
            ),
          );
        }
      }
      return d <= batch.linewidth / 2 + hitTolerance ? d : null;
    }
    return null;
  };

  const intersects = (id: number, loX: number, loY: number, hiX: number, hiY: number): boolean => {
    const batch = scene.batches[batchIds[id]!]!;
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    if (batch.kind === "rects") {
      const x = panel.x + batch.rects[i * 4]!;
      const y = panel.y + batch.rects[i * 4 + 1]!;
      const w = batch.rects[i * 4 + 2]!;
      const h = batch.rects[i * 4 + 3]!;
      const otherX = x + w;
      const otherY = y + h;
      return (
        Math.min(x, otherX) <= hiX &&
        Math.max(x, otherX) >= loX &&
        Math.min(y, otherY) <= hiY &&
        Math.max(y, otherY) >= loY
      );
    }
    if (batch.kind === "segments") {
      const renderStart = batch.renderPathOffsets?.[i];
      const renderEnd = batch.renderPathOffsets?.[i + 1];
      if (
        batch.renderPositions !== undefined &&
        renderStart !== undefined &&
        renderEnd !== undefined
      ) {
        for (let edge = renderStart; edge + 1 < renderEnd; edge++) {
          const x1 = panel.x + batch.renderPositions[edge * 2]!;
          const y1 = panel.y + batch.renderPositions[edge * 2 + 1]!;
          const x2 = panel.x + batch.renderPositions[(edge + 1) * 2]!;
          const y2 = panel.y + batch.renderPositions[(edge + 1) * 2 + 1]!;
          if (segmentIntersectsRect(x1, y1, x2, y2, loX, loY, hiX, hiY)) return true;
        }
        return false;
      }
      const x1 = panel.x + batch.segments[i * 4]!;
      const y1 = panel.y + batch.segments[i * 4 + 1]!;
      const x2 = panel.x + batch.segments[i * 4 + 2]!;
      const y2 = panel.y + batch.segments[i * 4 + 3]!;
      return segmentIntersectsRect(x1, y1, x2, y2, loX, loY, hiX, hiY);
    }
    if (batch.kind === "paths") {
      if (xs[id]! >= loX && xs[id]! <= hiX && ys[id]! >= loY && ys[id]! <= hiY) return true;
      const range = pathRange(batch, i);
      if (range !== null) {
        const semanticRange = pathSemanticNeighborRange(batch, i);
        if (
          semanticRange !== null &&
          pathSegmentsIntersectRect(batch, panel.x, panel.y, semanticRange, loX, loY, hiX, hiY)
        )
          return true;
        if (batch.fills !== undefined) {
          const centerX = (loX + hiX) / 2 - panel.x;
          const centerY = (loY + hiY) / 2 - panel.y;
          if (insidePath(batch, range[0], range[1], centerX, centerY)) return true;
        }
      }
      return false;
    }
    return xs[id]! >= loX && xs[id]! <= hiX && ys[id]! >= loY && ys[id]! <= hiY;
  };

  return { exactDistance, intersects };
}
