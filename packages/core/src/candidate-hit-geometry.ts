/**
 * One hit-geometry ops object per mark kind (distance / contains / intersects / aabb).
 * Callers dispatch through {@link createHitGeometry} instead of parallel kind-switches.
 */
import {
  insidePath,
  pathRange,
  pathSemanticNeighborRange,
  pathSubpathIndex,
  pointHitDistance,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import {
  pathSegmentsIntersectRect,
  pathSubpathAabb,
  pathVertexStrokeAabb,
} from "./candidate-path-geometry.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";
import type { GeometryBatch } from "./scene.js";

export type Aabb = readonly [minX: number, minY: number, maxX: number, maxY: number];

export type HitGeometry = {
  distance(
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  contains(id: number, px: number, py: number, pathContainment: Map<string, boolean>): boolean;
  intersects(id: number, loX: number, loY: number, hiX: number, hiY: number): boolean;
  aabb(id: number, pathAabbCache?: Map<string, Aabb>): Aabb;
};

type KindOps = {
  distance(
    indexes: CandidateStoreIndexes,
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  contains(
    indexes: CandidateStoreIndexes,
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): boolean;
  intersects(
    indexes: CandidateStoreIndexes,
    id: number,
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
  ): boolean;
  aabb(indexes: CandidateStoreIndexes, id: number, pathAabbCache?: Map<string, Aabb>): Aabb;
};

function localPoint(indexes: CandidateStoreIndexes, id: number, px: number, py: number) {
  const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
  return { x: px - panel.x, y: py - panel.y, panel };
}

function batchAt(indexes: CandidateStoreIndexes, id: number): GeometryBatch {
  return indexes.scene.batches[indexes.batchIds[id]!]!;
}

function anchorInRect(
  indexes: CandidateStoreIndexes,
  id: number,
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
): boolean {
  const x = indexes.xs[id]!;
  const y = indexes.ys[id]!;
  return x >= loX && x <= hiX && y >= loY && y <= hiY;
}

const pointsOps: KindOps = {
  contains: () => false,
  distance(indexes, id, px, py) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "points") return null;
    return pointHitDistance(
      batch,
      indexes.primitiveIds[id]!,
      px - indexes.xs[id]!,
      py - indexes.ys[id]!,
      indexes.hitTolerance,
    );
  },
  intersects: anchorInRect,
  aabb(indexes, id) {
    const batch = batchAt(indexes, id);
    const size =
      batch.kind === "points" ? (batch.sizes?.[indexes.primitiveIds[id]!] ?? batch.size) : 0;
    const pad = size + indexes.hitTolerance;
    const x = indexes.xs[id]!;
    const y = indexes.ys[id]!;
    return [x - pad, y - pad, x + pad, y + pad];
  },
};

const glyphsOps: KindOps = {
  contains: () => false,
  distance: () => null,
  intersects: anchorInRect,
  aabb(indexes, id) {
    const batch = batchAt(indexes, id);
    const pad = (batch.kind === "glyphs" ? batch.size : 0) + indexes.hitTolerance;
    const x = indexes.xs[id]!;
    const y = indexes.ys[id]!;
    return [x - pad, y - pad, x + pad, y + pad];
  },
};

const rectsOps: KindOps = {
  contains(indexes, id, px, py) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "rects") return false;
    const { x, y } = localPoint(indexes, id, px, py);
    const i = indexes.primitiveIds[id]!;
    const rx = batch.rects[i * 4]!;
    const ry = batch.rects[i * 4 + 1]!;
    const rw = batch.rects[i * 4 + 2]!;
    const rh = batch.rects[i * 4 + 3]!;
    return (
      x >= Math.min(rx, rx + rw) &&
      x <= Math.max(rx, rx + rw) &&
      y >= Math.min(ry, ry + rh) &&
      y <= Math.max(ry, ry + rh)
    );
  },
  distance(indexes, id, px, py, pathContainment) {
    return rectsOps.contains(indexes, id, px, py, pathContainment) ? 0 : null;
  },
  intersects(indexes, id, loX, loY, hiX, hiY) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "rects") return false;
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
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
  },
  aabb(indexes, id) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "rects") return [0, 0, 0, 0];
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
    const rx = panel.x + batch.rects[i * 4]!;
    const ry = panel.y + batch.rects[i * 4 + 1]!;
    const rw = batch.rects[i * 4 + 2]!;
    const rh = batch.rects[i * 4 + 3]!;
    return [
      Math.min(rx, rx + rw),
      Math.min(ry, ry + rh),
      Math.max(rx, rx + rw),
      Math.max(ry, ry + rh),
    ];
  },
};

const segmentsOps: KindOps = {
  contains: () => false,
  distance(indexes, id, px, py) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "segments") return null;
    const { x, y } = localPoint(indexes, id, px, py);
    const i = indexes.primitiveIds[id]!;
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
    return d <= (batch.linewidths?.[i] ?? batch.linewidth) / 2 + indexes.hitTolerance ? d : null;
  },
  intersects(indexes, id, loX, loY, hiX, hiY) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "segments") return false;
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
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
  },
  aabb(indexes, id) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "segments") return [0, 0, 0, 0];
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
    const pad = (batch.linewidths?.[i] ?? batch.linewidth) / 2 + indexes.hitTolerance;
    const renderStart = batch.renderPathOffsets?.[i];
    const renderEnd = batch.renderPathOffsets?.[i + 1];
    if (
      batch.renderPositions !== undefined &&
      renderStart !== undefined &&
      renderEnd !== undefined &&
      renderEnd > renderStart
    ) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let vertex = renderStart; vertex < renderEnd; vertex++) {
        const x = panel.x + batch.renderPositions[vertex * 2]!;
        const y = panel.y + batch.renderPositions[vertex * 2 + 1]!;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      return [minX - pad, minY - pad, maxX + pad, maxY + pad];
    }
    const x1 = panel.x + batch.segments[i * 4]!;
    const y1 = panel.y + batch.segments[i * 4 + 1]!;
    const x2 = panel.x + batch.segments[i * 4 + 2]!;
    const y2 = panel.y + batch.segments[i * 4 + 3]!;
    return [
      Math.min(x1, x2) - pad,
      Math.min(y1, y2) - pad,
      Math.max(x1, x2) + pad,
      Math.max(y1, y2) + pad,
    ];
  },
};

const pathsOps: KindOps = {
  contains(indexes, id, px, py, pathContainment) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "paths" || batch.fills === undefined) return false;
    const { x, y } = localPoint(indexes, id, px, py);
    const range = pathRange(batch, indexes.primitiveIds[id]!);
    if (range === null) return false;
    const containmentKey = `${indexes.batchIds[id]}:${range[0]}:${range[1]}`;
    let contained = pathContainment.get(containmentKey);
    if (contained === undefined) {
      contained = insidePath(batch, range[0], range[1], x, y);
      pathContainment.set(containmentKey, contained);
    }
    return contained;
  },
  distance(indexes, id, px, py, pathContainment) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "paths") return null;
    const { x, y } = localPoint(indexes, id, px, py);
    const i = indexes.primitiveIds[id]!;
    const range = pathRange(batch, i);
    if (batch.fills !== undefined && range !== null) {
      return pathsOps.contains(indexes, id, px, py, pathContainment)
        ? Math.hypot(px - indexes.xs[id]!, py - indexes.ys[id]!)
        : null;
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
    const subpath = pathSubpathIndex(batch.pathOffsets, i);
    const linewidth =
      subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth);
    return d <= linewidth / 2 + indexes.hitTolerance ? d : null;
  },
  intersects(indexes, id, loX, loY, hiX, hiY) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "paths") return false;
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
    if (anchorInRect(indexes, id, loX, loY, hiX, hiY)) return true;
    const range = pathRange(batch, i);
    if (range === null) return false;
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
    return false;
  },
  aabb(indexes, id, pathAabbCache) {
    const batch = batchAt(indexes, id);
    if (batch.kind !== "paths") return [0, 0, 0, 0];
    const panel = indexes.scene.panels[indexes.panelIds[id]!]!;
    const i = indexes.primitiveIds[id]!;
    const range = pathRange(batch, i);
    if (range === null) {
      const x = indexes.xs[id]!;
      const y = indexes.ys[id]!;
      return [x, y, x, y];
    }
    if (batch.fills === undefined) {
      return pathVertexStrokeAabb(
        batch,
        panel.x,
        panel.y,
        i,
        range[0],
        range[1],
        indexes.hitTolerance,
      );
    }
    const cacheKey = `${indexes.batchIds[id]}:${range[0]}:${range[1]}`;
    let box = pathAabbCache?.get(cacheKey);
    if (box === undefined) {
      box = pathSubpathAabb(
        batch,
        panel.x,
        panel.y,
        range[0],
        range[1],
        indexes.xs[id]!,
        indexes.ys[id]!,
        indexes.hitTolerance,
      );
      pathAabbCache?.set(cacheKey, box);
    }
    return box;
  },
};

/** Dispatch table: one ops object per mark kind. */
export const MARK_HIT_GEOMETRY = {
  points: pointsOps,
  rects: rectsOps,
  segments: segmentsOps,
  paths: pathsOps,
  glyphs: glyphsOps,
} as const satisfies Record<GeometryBatch["kind"], KindOps>;

/** Build id-keyed hit geometry that dispatches through {@link MARK_HIT_GEOMETRY}. */
export function createHitGeometry(indexes: CandidateStoreIndexes): HitGeometry {
  const opsFor = (id: number): KindOps => MARK_HIT_GEOMETRY[batchAt(indexes, id).kind];
  return {
    distance: (id, px, py, pathContainment) =>
      opsFor(id).distance(indexes, id, px, py, pathContainment),
    contains: (id, px, py, pathContainment) =>
      opsFor(id).contains(indexes, id, px, py, pathContainment),
    intersects: (id, loX, loY, hiX, hiY) => opsFor(id).intersects(indexes, id, loX, loY, hiX, hiY),
    aabb: (id, pathAabbCache) => opsFor(id).aabb(indexes, id, pathAabbCache),
  };
}
