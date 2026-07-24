/**
 * Spatial shortlist indexes for an assembled candidate store: anchor quadtree,
 * per-batch point trees, size-classed extended AABB trees, and shortlist APIs.
 * Size-class layout stays closure-private.
 */
import { StaticQuadtree } from "./dom/quadtree.js";
import { createHitGeometry } from "./candidate-hit-geometry.js";
import type { CandidateInspectMode } from "./candidate-store-types.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";

type PointBatchIndex = {
  readonly batchIndex: number;
  readonly ids: number[];
  readonly spatial: StaticQuadtree;
};

export type SpatialIndex = {
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
  shortlistNearest(
    px: number,
    py: number,
    mode: CandidateInspectMode,
    maxDistance: number,
  ): number[];
};

/** Build shortlist indexes and shortlist helpers for an eager store. */
export function buildSpatialIndex(indexes: CandidateStoreIndexes): SpatialIndex {
  const { scene, n, hitTolerance, flip, batchIds, primitiveIds, xs, ys } = indexes;
  const hit = createHitGeometry(indexes);

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
    // glyphs still need a finite AABB for index init even though they never hit.
    const [minX, minY, maxX, maxY] = hit.aabb(id, pathAabbCache);
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
    shortlistNearest,
  };
}
