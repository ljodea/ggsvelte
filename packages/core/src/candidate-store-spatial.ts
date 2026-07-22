import { StaticQuadtree } from "./dom/quadtree.js";
import {
  insidePath,
  pointHitDistance,
  pathRange,
  pathSemanticNeighborRange,
  pathSubpathIndex,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import {
  pathSegmentsIntersectRect,
  pathSubpathAabb,
  pathVertexStrokeAabb,
} from "./candidate-path-geometry.js";
import type { CandidateInspectMode } from "./candidate-store-types.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";

type PointBatchIndex = {
  readonly batchIndex: number;
  readonly ids: number[];
  readonly spatial: StaticQuadtree;
};

export type CandidateSpatialQuery = {
  readonly spatial: StaticQuadtree | null;
  readonly isPoint: Uint8Array;
  readonly maxPointReach: number;
  readonly pointBatchIndexes: readonly PointBatchIndex[];
  addExtendedIntersecting(
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void;
  exactDistance(
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  intersects(id: number, loX: number, loY: number, hiX: number, hiY: number): boolean;
  shortlistNearest(
    px: number,
    py: number,
    mode: CandidateInspectMode,
    maxDistance: number,
  ): number[];
};

/** Build spatial shortlist indexes and geometry refine helpers for an eager store. */
export function buildCandidateSpatialQuery(indexes: CandidateStoreIndexes): CandidateSpatialQuery {
  const { scene, n, hitTolerance, flip, batchIds, primitiveIds, panelIds, xs, ys } = indexes;

  // Spatial index over plot-px anchors (reuse StaticQuadtree). Point-like
  // candidates shortlist via the tree; rects/segments/paths/glyphs use
  // size-classed AABB-center trees so hit regions far from anchors still
  // shortlist without force-adding every extended id. Classes bucket by
  // log2(max half-extent) so one giant AABB cannot expand every query to O(E).
  const spatialXs = Float64Array.from(xs);
  const spatialYs = Float64Array.from(ys);
  const spatial = n > 0 ? new StaticQuadtree(spatialXs, spatialYs) : null;
  const isPoint = new Uint8Array(n);
  const pointIdsByBatch = new Map<number, number[]>();
  const extendedIds: number[] = [];
  const extMinXBuild: number[] = [];
  const extMinYBuild: number[] = [];
  const extMaxXBuild: number[] = [];
  const extMaxYBuild: number[] = [];
  // Subpath AABB cache: `${batchIndex}:${start}:${end}` → box (plot px).
  const pathAabbCache = new Map<string, readonly [number, number, number, number]>();
  let maxPointReach = 0;
  for (let id = 0; id < n; id++) {
    const batch = scene.batches[batchIds[id]!]!;
    if (batch.kind === "points") {
      isPoint[id] = 1;
      const primitive = primitiveIds[id]!;
      maxPointReach = Math.max(
        maxPointReach,
        (batch.sizes?.[primitive] ?? batch.size) * 1.25 + hitTolerance,
      );
      const ids = pointIdsByBatch.get(batchIds[id]!);
      if (ids === undefined) pointIdsByBatch.set(batchIds[id]!, [id]);
      else ids.push(id);
      continue;
    }
    extendedIds.push(id);
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    let minX: number;
    let minY: number;
    let maxX: number;
    let maxY: number;
    if (batch.kind === "rects") {
      const rx = panel.x + batch.rects[i * 4]!;
      const ry = panel.y + batch.rects[i * 4 + 1]!;
      const rw = batch.rects[i * 4 + 2]!;
      const rh = batch.rects[i * 4 + 3]!;
      minX = Math.min(rx, rx + rw);
      minY = Math.min(ry, ry + rh);
      maxX = Math.max(rx, rx + rw);
      maxY = Math.max(ry, ry + rh);
    } else if (batch.kind === "segments") {
      const pad = (batch.linewidths?.[i] ?? batch.linewidth) / 2 + hitTolerance;
      const renderStart = batch.renderPathOffsets?.[i];
      const renderEnd = batch.renderPathOffsets?.[i + 1];
      if (
        batch.renderPositions !== undefined &&
        renderStart !== undefined &&
        renderEnd !== undefined &&
        renderEnd > renderStart
      ) {
        minX = Infinity;
        minY = Infinity;
        maxX = -Infinity;
        maxY = -Infinity;
        for (let vertex = renderStart; vertex < renderEnd; vertex++) {
          const x = panel.x + batch.renderPositions[vertex * 2]!;
          const y = panel.y + batch.renderPositions[vertex * 2 + 1]!;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
        minX -= pad;
        minY -= pad;
        maxX += pad;
        maxY += pad;
      } else {
        const x1 = panel.x + batch.segments[i * 4]!;
        const y1 = panel.y + batch.segments[i * 4 + 1]!;
        const x2 = panel.x + batch.segments[i * 4 + 2]!;
        const y2 = panel.y + batch.segments[i * 4 + 3]!;
        minX = Math.min(x1, x2) - pad;
        minY = Math.min(y1, y2) - pad;
        maxX = Math.max(x1, x2) + pad;
        maxY = Math.max(y1, y2) + pad;
      }
    } else if (batch.kind === "paths") {
      // Filled paths: full subpath AABB (containment far from any vertex).
      // Stroked paths: AABB of incident edges only — a plot-spanning series
      // used to tag every vertex with the same giant box, forcing Θ(V) refine
      // on nearest/exact (hit-index already edge-shortlists strokes).
      const range = pathRange(batch, i);
      if (range === null) {
        minX = xs[id]!;
        minY = ys[id]!;
        maxX = minX;
        maxY = minY;
      } else if (batch.fills === undefined) {
        const box = pathVertexStrokeAabb(
          batch,
          panel.x,
          panel.y,
          i,
          range[0],
          range[1],
          hitTolerance,
        );
        minX = box[0];
        minY = box[1];
        maxX = box[2];
        maxY = box[3];
      } else {
        const cacheKey = `${batchIds[id]}:${range[0]}:${range[1]}`;
        let box = pathAabbCache.get(cacheKey);
        if (box === undefined) {
          box = pathSubpathAabb(
            batch,
            panel.x,
            panel.y,
            range[0],
            range[1],
            xs[id]!,
            ys[id]!,
            hitTolerance,
          );
          pathAabbCache.set(cacheKey, box);
        }
        minX = box[0];
        minY = box[1];
        maxX = box[2];
        maxY = box[3];
      }
    } else {
      // glyphs: text is not a hit target (hit-index), but still needs a finite
      // AABB so store init never pathRange()'s a non-path batch (Codex P1).
      const pad = batch.size + hitTolerance;
      minX = xs[id]! - pad;
      minY = ys[id]! - pad;
      maxX = xs[id]! + pad;
      maxY = ys[id]! + pad;
    }
    extMinXBuild.push(minX);
    extMinYBuild.push(minY);
    extMaxXBuild.push(maxX);
    extMaxYBuild.push(maxY);
  }
  pathAabbCache.clear();

  // Pointer hit testing preserves reverse paint order and per-batch point
  // radius without expanding every query by the largest point in the scene.
  // This mirrors paint batches while remaining private to CandidateStore.
  const pointBatchIndexes = [...pointIdsByBatch.entries()].map(([batchIndex, ids]) => {
    const pointXs = new Float64Array(ids.length);
    const pointYs = new Float64Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      pointXs[i] = xs[ids[i]!]!;
      pointYs[i] = ys[ids[i]!]!;
    }
    return {
      batchIndex,
      ids,
      spatial: new StaticQuadtree(pointXs, pointYs),
    };
  });
  pointIdsByBatch.clear();

  const extN = extendedIds.length;
  const extMinX = Float64Array.from(extMinXBuild);
  const extMinY = Float64Array.from(extMinYBuild);
  const extMaxX = Float64Array.from(extMaxXBuild);
  const extMaxY = Float64Array.from(extMaxYBuild);
  extMinXBuild.length = 0;
  extMinYBuild.length = 0;
  extMaxXBuild.length = 0;
  extMaxYBuild.length = 0;

  // Size-class trees: class key = ceil(log2(max half-extent)).
  type ExtendedClass = {
    readonly eis: readonly number[];
    readonly maxHalfW: number;
    readonly maxHalfH: number;
    readonly spatial: StaticQuadtree;
  };
  const classBuckets = new Map<number, number[]>();
  for (let ei = 0; ei < extN; ei++) {
    const halfW = (extMaxX[ei]! - extMinX[ei]!) / 2;
    const halfH = (extMaxY[ei]! - extMinY[ei]!) / 2;
    const m = Math.max(halfW, halfH, 1e-9);
    const key = Math.min(31, Math.ceil(Math.log2(m)));
    const bucket = classBuckets.get(key);
    if (bucket === undefined) classBuckets.set(key, [ei]);
    else bucket.push(ei);
  }
  const extendedClasses: ExtendedClass[] = [];
  for (const eis of classBuckets.values()) {
    const cxs = new Float64Array(eis.length);
    const cys = new Float64Array(eis.length);
    let maxHalfW = 0;
    let maxHalfH = 0;
    for (let j = 0; j < eis.length; j++) {
      const ei = eis[j]!;
      const halfW = (extMaxX[ei]! - extMinX[ei]!) / 2;
      const halfH = (extMaxY[ei]! - extMinY[ei]!) / 2;
      cxs[j] = (extMinX[ei]! + extMaxX[ei]!) / 2;
      cys[j] = (extMinY[ei]! + extMaxY[ei]!) / 2;
      if (halfW > maxHalfW) maxHalfW = halfW;
      if (halfH > maxHalfH) maxHalfH = halfH;
    }
    extendedClasses.push({
      eis,
      maxHalfW,
      maxHalfH,
      spatial: new StaticQuadtree(cxs, cys),
    });
  }
  classBuckets.clear();

  /** Add extended ids whose AABB intersects the axis-aligned query box. */
  const addExtendedIntersecting = (
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void => {
    for (const cls of extendedClasses) {
      // Intersecting AABBs have centers inside query expanded by *this class's*
      // half-extents — not the global max (avoids one giant bar scanning all E).
      for (const j of cls.spatial.queryRect(
        loX - cls.maxHalfW,
        loY - cls.maxHalfH,
        hiX + cls.maxHalfW,
        hiY + cls.maxHalfH,
      )) {
        const ei = cls.eis[j]!;
        if (extMaxX[ei]! < loX || extMinX[ei]! > hiX || extMaxY[ei]! < loY || extMinY[ei]! > hiY)
          continue;
        const id = extendedIds[ei]!;
        if (Array.isArray(into)) into.push(id);
        else into.add(id);
      }
    }
  };

  // Far-plane strip bounds: StaticQuadtree prunes on the finite axis only.
  const STRIP = 1e30;

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
      return pointHitDistance(batch, i, px - xs[id]!, py - ys[id]!, hitTolerance);
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
      return d <= (batch.linewidths?.[i] ?? batch.linewidth) / 2 + hitTolerance ? d : null;
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
      const subpath = pathSubpathIndex(batch.pathOffsets, i);
      const linewidth =
        subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth);
      return d <= linewidth / 2 + hitTolerance ? d : null;
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

  /** Shortlist candidate ids for a nearest query (reverse-id order for topmost ties). */
  const shortlistNearest = (
    px: number,
    py: number,
    mode: CandidateInspectMode,
    maxDistance: number,
  ): number[] => {
    if (spatial === null || n === 0) return [];
    const consider = new Set<number>();
    const addRect = (x0: number, y0: number, x1: number, y1: number) => {
      for (const id of spatial.queryRect(x0, y0, x1, y1)) consider.add(id);
    };
    if (mode === "xy") {
      addRect(px - maxDistance, py - maxDistance, px + maxDistance, py + maxDistance);
    } else if (mode === "x") {
      // Dominant-axis distance is along semantic x (screen y when coord_flip).
      // Axis token maps stay for group(); nearest uses spatial strips.
      if (flip) addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
      else addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
    } else if (mode === "y") {
      if (flip) addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
      else addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
    } else {
      // exact / auto: point anchors within hit reach + extended geometry whose
      // AABB meets the probe (rects/segments/paths can sit far from anchors).
      const r = mode === "auto" ? Math.max(maxDistance, maxPointReach) : maxPointReach;
      addRect(px - r, py - r, px + r, py + r);
      if (mode === "auto") {
        // Per-candidate autoMode can still be x/y (e.g. boxplot outliers):
        // include dominant-axis strips so orthogonal distance does not drop them.
        if (flip) {
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
        } else {
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
        }
      }
      // exact containment uses the point AABB; auto still needs maxDistance pad
      // for dominant-axis extended matches that refine after shortlist.
      const pad = mode === "auto" ? maxDistance : 0;
      addExtendedIntersecting(px - pad, py - pad, px + pad, py + pad, consider);
    }
    return [...consider].toSorted((a, b) => b - a);
  };

  return {
    spatial,
    isPoint,
    maxPointReach,
    pointBatchIndexes,
    addExtendedIntersecting,
    exactDistance,
    intersects,
    shortlistNearest,
  };
}
