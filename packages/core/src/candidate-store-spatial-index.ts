/**
 * Spatial shortlist indexes for an assembled candidate store: anchor quadtree,
 * per-batch point trees, size-classed extended AABB trees, and shortlist APIs.
 * Size-class layout stays closure-private.
 *
 * Filled paths (#1342): one extended AABB entry per subpath (not per vertex).
 * Filled candidates are omitted from the main anchor tree so strip shortlists
 * stay O(non-filled + subpaths) instead of O(all area vertices).
 */
import { pathRange } from "./candidate-geometry.js";
import { StaticQuadtree } from "./dom/quadtree.js";
import type { HitGeometry } from "./candidate-hit-geometry.js";
import type { CandidateInspectMode } from "./candidate-store-types.js";
import type { CandidateStoreIndexes } from "./candidate-store-indexes.js";

type PointBatchIndex = {
  readonly batchIndex: number;
  readonly ids: number[];
  readonly spatial: StaticQuadtree;
  /** max(batch.size, …batch.sizes) * 1.25 — query pad without hitTolerance. */
  readonly maxRadius: number;
};

export type SpatialIndex = {
  readonly spatial: StaticQuadtree | null;
  readonly isPoint: Uint8Array;
  /** 1 when the candidate is a filled-path vertex (area / ribbon / band). */
  readonly isFilledPath: Uint8Array;
  /**
   * Inclusive-exclusive candidate id span of the filled subpath containing `id`.
   * `-1` when `isFilledPath[id] === 0`. All members of a subpath share the same span.
   */
  readonly filledSpanStart: Int32Array;
  readonly filledSpanEnd: Int32Array;
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
export function buildSpatialIndex(indexes: CandidateStoreIndexes, hit: HitGeometry): SpatialIndex {
  const { scene, n, hitTolerance, flip, batchIds, primitiveIds, xs, ys } = indexes;

  // Spatial index over plot-px anchors (reuse StaticQuadtree). Point-like
  // candidates shortlist via the tree; rects/segments/paths/glyphs use
  // size-classed AABB-center trees so hit regions far from anchors still
  // shortlist without force-adding every extended id. Classes bucket by
  // log2(max half-extent) so one giant AABB cannot expand every query to O(E).
  // Filled path vertices use NaN so StaticQuadtree skips them (#1342).
  const spatialXs = Float64Array.from(xs);
  const spatialYs = Float64Array.from(ys);
  const isPoint = new Uint8Array(n);
  const isFilledPath = new Uint8Array(n);
  const filledSpanStart = new Int32Array(n);
  const filledSpanEnd = new Int32Array(n);
  filledSpanStart.fill(-1);
  filledSpanEnd.fill(-1);
  const pointIdsByBatch = new Map<number, number[]>();
  const extendedIds: number[] = [];
  const extMinXBuild: number[] = [];
  const extMinYBuild: number[] = [];
  const extMaxXBuild: number[] = [];
  const extMaxYBuild: number[] = [];
  // Subpath AABB cache: `${batchIndex}:${start}:${end}` → box (plot px).
  const pathAabbCache = new Map<string, readonly [number, number, number, number]>();
  let maxPointReach = 0;

  // First pass: classify points / filled paths; strip filled anchors from spatial.
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
    if (batch.kind === "paths" && batch.fills !== undefined) {
      isFilledPath[id] = 1;
      spatialXs[id] = Number.NaN;
      spatialYs[id] = Number.NaN;
    }
  }

  // Second pass: extended AABBs. Filled paths contribute one entry per subpath
  // (first candidate id in the subpath span). Stroked paths / rects / segments /
  // glyphs stay one entry per candidate.
  for (let id = 0; id < n;) {
    if (isPoint[id] === 1) {
      id++;
      continue;
    }
    if (isFilledPath[id] === 1) {
      const batchIndex = batchIds[id]!;
      const batch = scene.batches[batchIndex]!;
      if (batch.kind !== "paths") {
        id++;
        continue;
      }
      const range = pathRange(batch, primitiveIds[id]!);
      const range0 = range?.[0] ?? -1;
      const range1 = range?.[1] ?? -1;
      const startId = id;
      id++;
      while (id < n && isFilledPath[id] === 1 && batchIds[id] === batchIndex) {
        const next = pathRange(batch, primitiveIds[id]!);
        if (next === null || next[0] !== range0 || next[1] !== range1) break;
        id++;
      }
      const endId = id;
      for (let j = startId; j < endId; j++) {
        filledSpanStart[j] = startId;
        filledSpanEnd[j] = endId;
      }
      // One extended entry for the whole filled subpath.
      extendedIds.push(startId);
      const [minX, minY, maxX, maxY] = hit.aabb(startId, pathAabbCache);
      extMinXBuild.push(minX);
      extMinYBuild.push(minY);
      extMaxXBuild.push(maxX);
      extMaxYBuild.push(maxY);
      continue;
    }
    extendedIds.push(id);
    // glyphs still need a finite AABB for index init even though they never hit.
    const [minX, minY, maxX, maxY] = hit.aabb(id, pathAabbCache);
    extMinXBuild.push(minX);
    extMinYBuild.push(minY);
    extMaxXBuild.push(maxX);
    extMaxYBuild.push(maxY);
    id++;
  }
  pathAabbCache.clear();
  const spatial = n > 0 ? new StaticQuadtree(spatialXs, spatialYs) : null;

  // Pointer hit testing preserves reverse paint order and per-batch point
  // radius without expanding every query by the largest point in the scene.
  // This mirrors paint batches while remaining private to CandidateStore.
  // maxRadius is fixed at build so hitTest never O(P)-scans batch.sizes (#978).
  const pointBatchIndexes = [...pointIdsByBatch.entries()].map(([batchIndex, ids]) => {
    const pointXs = new Float64Array(ids.length);
    const pointYs = new Float64Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      pointXs[i] = xs[ids[i]!]!;
      pointYs[i] = ys[ids[i]!]!;
    }
    const batch = scene.batches[batchIndex]!;
    let maxRadius = 0;
    if (batch.kind === "points") {
      maxRadius = batch.size;
      if (batch.sizes !== undefined) {
        for (const radius of batch.sizes) maxRadius = Math.max(maxRadius, radius);
      }
      maxRadius *= 1.25;
    }
    return {
      batchIndex,
      ids,
      spatial: new StaticQuadtree(pointXs, pointYs),
      maxRadius,
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
  const buildSizeClasses = (eisFilter: (ei: number) => boolean): ExtendedClass[] => {
    const classBuckets = new Map<number, number[]>();
    for (let ei = 0; ei < extN; ei++) {
      if (!eisFilter(ei)) continue;
      const halfW = (extMaxX[ei]! - extMinX[ei]!) / 2;
      const halfH = (extMaxY[ei]! - extMinY[ei]!) / 2;
      const m = Math.max(halfW, halfH, 1e-9);
      const key = Math.min(31, Math.ceil(Math.log2(m)));
      const bucket = classBuckets.get(key);
      if (bucket === undefined) classBuckets.set(key, [ei]);
      else bucket.push(ei);
    }
    const classes: ExtendedClass[] = [];
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
      classes.push({
        eis,
        maxHalfW,
        maxHalfH,
        spatial: new StaticQuadtree(cxs, cys),
      });
    }
    return classes;
  };
  const extendedClasses = buildSizeClasses(() => true);
  // Filled-path reps only — strip shortlists for axis modes must not pull every
  // bar/segment whose tall AABB crosses an infinite strip (Devin #1342 review).
  const filledExtendedClasses = buildSizeClasses((ei) => isFilledPath[extendedIds[ei]!] === 1);

  const addFromClasses = (
    classes: readonly ExtendedClass[],
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void => {
    for (const cls of classes) {
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

  /** Add extended ids whose AABB intersects the axis-aligned query box. */
  const addExtendedIntersecting = (
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void => {
    addFromClasses(extendedClasses, loX, loY, hiX, hiY, into);
  };

  /** Filled-subpath reps only — for axis-strip shortlists that omit filled anchors. */
  const addFilledPathIntersecting = (
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void => {
    addFromClasses(filledExtendedClasses, loX, loY, hiX, hiY, into);
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
    if (n === 0) return [];
    const consider = new Set<number>();
    const addRect = (x0: number, y0: number, x1: number, y1: number) => {
      if (spatial === null) return;
      for (const id of spatial.queryRect(x0, y0, x1, y1)) consider.add(id);
    };
    if (mode === "xy") {
      addRect(px - maxDistance, py - maxDistance, px + maxDistance, py + maxDistance);
      // Filled areas omit anchors from `spatial`; full extended tree still
      // holds one rep per filled subpath plus rects/segments/stroked paths.
      addExtendedIntersecting(
        px - maxDistance,
        py - maxDistance,
        px + maxDistance,
        py + maxDistance,
        consider,
      );
    } else if (mode === "x") {
      // Dominant-axis distance is along semantic x (screen y when coord_flip).
      // Axis token maps stay for group(); nearest uses spatial strips.
      // Filled path verts are not in spatial (#1342) — filled-only strip AABBs.
      if (flip) {
        addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
        addFilledPathIntersecting(-STRIP, py - maxDistance, STRIP, py + maxDistance, consider);
      } else {
        addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
        addFilledPathIntersecting(px - maxDistance, -STRIP, px + maxDistance, STRIP, consider);
      }
    } else if (mode === "y") {
      if (flip) {
        addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
        addFilledPathIntersecting(px - maxDistance, -STRIP, px + maxDistance, STRIP, consider);
      } else {
        addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
        addFilledPathIntersecting(-STRIP, py - maxDistance, STRIP, py + maxDistance, consider);
      }
    } else {
      // exact / auto: point anchors within hit reach + extended geometry whose
      // AABB meets the probe (rects/segments/paths can sit far from anchors).
      // Filled path verts are NaN-skipped in spatial; reps arrive via extended.
      const r = mode === "auto" ? Math.max(maxDistance, maxPointReach) : maxPointReach;
      addRect(px - r, py - r, px + r, py + r);
      if (mode === "auto") {
        // Per-candidate autoMode can still be x/y (e.g. boxplot outliers):
        // include dominant-axis strips so orthogonal distance does not drop them.
        // Filled path reps: filled-only strip trees (not every bar AABB).
        if (flip) {
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
          addFilledPathIntersecting(-STRIP, py - maxDistance, STRIP, py + maxDistance, consider);
          addFilledPathIntersecting(px - maxDistance, -STRIP, px + maxDistance, STRIP, consider);
        } else {
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
          addFilledPathIntersecting(px - maxDistance, -STRIP, px + maxDistance, STRIP, consider);
          addFilledPathIntersecting(-STRIP, py - maxDistance, STRIP, py + maxDistance, consider);
        }
      }
      // exact containment uses the point AABB; auto still needs maxDistance pad
      // for dominant-axis extended matches that refine after shortlist.
      // Filled-path reps also need a pad on exact when the probe is outside the
      // subpath AABB but within maxDistance of an anchor (rare for areas).
      const pad = mode === "auto" ? maxDistance : 0;
      addExtendedIntersecting(px - pad, py - pad, px + pad, py + pad, consider);
    }
    return [...consider].toSorted((a, b) => b - a);
  };

  return {
    spatial,
    isPoint,
    isFilledPath,
    filledSpanStart,
    filledSpanEnd,
    maxPointReach,
    pointBatchIndexes,
    addExtendedIntersecting,
    shortlistNearest,
  };
}
