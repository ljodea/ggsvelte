import {
  closestOrthInRange,
  directionalNearestInOrder,
  panelRangeInOrder,
} from "./candidate-geometry-nearest.js";
import { resolveTopmostHit } from "./candidate-hit-resolve.js";
import { AUTO_MODES, buildCandidateStoreIndexes } from "./candidate-store-indexes.js";
import type { BucketBoundary, SeriesBoundary } from "./candidate-store-indexes.js";
import { buildCandidateSpatialQuery } from "./candidate-store-spatial.js";
import type {
  CandidateStore,
  CandidateStoreOptions,
  ResolvedCandidateInspectMode,
} from "./candidate-store-types.js";
import type { Scene } from "./scene.js";

/** Shared empty anchors returned by disposed / uninitialized stores. */
export const EMPTY_FLOAT32 = new Float32Array(0);
export const EMPTY_UINT32 = new Uint32Array(0);

/**
 * Assembled candidate store: compact indexes + query methods.
 * Construction phases:
 * - candidate-store-indexes.ts — typed arrays, traversal, group buckets
 * - candidate-store-spatial.ts — spatial shortlist + hit-geometry refine
 * - candidate-hit-geometry.ts — one ops table per mark kind
 * - candidate-hit-resolve.ts — topmost-hit + tie-break policy
 * - candidate-path-geometry.ts — path AABB / edge helpers
 */
export function assembleCandidateStore(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStore {
  const indexes = buildCandidateStoreIndexes(scene, options);
  const {
    epoch,
    n,
    flip,
    hitTolerance,
    batchIds,
    primitiveIds,
    panelIds,
    series,
    ranks,
    sources,
    autoModes,
    xs,
    ys,
    xTokenIds,
    yTokenIds,
    tokens,
    traversal,
    traversalRank,
    orderByX,
    coincidentStack,
    coincidentAt,
    permutations,
    buckets,
  } = indexes;
  const query = buildCandidateSpatialQuery(indexes);
  const { spatial, isPoint, pointBatchIndexes } = query;

  return {
    epoch,
    size: n,
    x: xs,
    y: ys,
    candidate: (id) => indexes.fact(id),
    hitTest(px, py) {
      return resolveTopmostHit(
        {
          scene,
          hitTolerance,
          batchIds,
          primitiveIds,
          panelIds,
          xs,
          ys,
          pointBatchIndexes,
          addExtendedIntersecting: (loX, loY, hiX, hiY, into) => {
            query.addExtendedIntersecting(loX, loY, hiX, hiY, into);
          },
          exactDistance: (id, x, y, pathContainment) =>
            query.exactDistance(id, x, y, pathContainment),
          fact: (id) => indexes.fact(id),
        },
        px,
        py,
      );
    },
    nearest(px, py, search) {
      let best = -1,
        bestDistance = Infinity,
        bestOrth = Infinity;
      const mode: ResolvedCandidateInspectMode = search.mode === "auto" ? "exact" : search.mode;
      let resultMode: ResolvedCandidateInspectMode = mode;
      const pathContainment = new Map<string, boolean>();
      const ids =
        spatial === null
          ? Array.from({ length: n }, (_, id) => n - 1 - id)
          : query.shortlistNearest(px, py, search.mode, search.maxDistance);
      for (const id of ids) {
        if (search.panelId !== undefined && scene.panels[panelIds[id]!]!.id !== search.panelId)
          continue;
        const candidateMode = search.mode === "auto" ? AUTO_MODES[autoModes[id]!]! : mode;
        if (
          (candidateMode === "x" && xTokenIds[id] === -1) ||
          (candidateMode === "y" && yTokenIds[id] === -1)
        )
          continue;
        const distance =
          candidateMode === "exact"
            ? query.exactDistance(id, px, py, pathContainment)
            : candidateMode === "x"
              ? Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px))
              : candidateMode === "y"
                ? Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py))
                : Math.hypot(xs[id]! - px, ys[id]! - py);
        if (distance === null || (candidateMode !== "exact" && distance > search.maxDistance))
          continue;
        const orth =
          candidateMode === "x"
            ? Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py))
            : candidateMode === "y"
              ? Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px))
              : 0;
        if (distance < bestDistance || (distance === bestDistance && orth < bestOrth)) {
          best = id;
          bestDistance = distance;
          bestOrth = orth;
          resultMode = candidateMode;
        }
      }
      const found = indexes.fact(best);
      return found === null ? null : { ...found, distance: bestDistance, mode: resultMode };
    },
    group(seedId, axis) {
      if (seedId < 0 || seedId >= n) return null;
      const keys = axis === "x" ? xTokenIds : yTokenIds;
      const key = keys[seedId];
      if (key === -1 || key === undefined) return null;
      const panel = panelIds[seedId]!;
      const tuple: BucketBoundary | undefined = buckets[axis].get(`${panel}|${key}`);
      if (tuple === undefined) return null;
      const { start, end } = tuple;
      const permutation = permutations[axis];
      const orth = axis === "x" ? (flip ? xs : ys) : flip ? ys : xs;
      const seedLayer = scene.batches[batchIds[seedId]!]!.layerIndex;
      const memberIds = new Uint32Array(tuple.series.length);
      const seedOrth = orth[seedId]!;
      for (let boundaryIndex = 0; boundaryIndex < tuple.series.length; boundaryIndex++) {
        const boundary: SeriesBoundary = tuple.series[boundaryIndex]!;
        if (boundary.layerIndex === seedLayer && boundary.seriesId === series[seedId]) {
          memberIds[boundaryIndex] = seedId;
          continue;
        }
        // Bucket sort orders ranks before orth. A single layer/series boundary
        // is orth-sorted only when rank is constant across the range; otherwise
        // fall back to linear closest (preserves prior group() semantics).
        const firstId = permutation[boundary.start]!;
        const lastId = permutation[boundary.end - 1]!;
        const orthSorted = ranks[firstId] === ranks[lastId];
        memberIds[boundaryIndex] = closestOrthInRange(
          permutation,
          orth,
          batchIds,
          sources,
          boundary.start,
          boundary.end,
          seedOrth,
          orthSorted,
        );
      }
      return {
        axis,
        axisValue: indexes.logicalValue(seedId, axis),
        token: tokens[key]!,
        focusId: seedId,
        memberIds,
        range: { axis, panelIndex: panel, start, end, permutation },
      };
    },
    traverse(startId, direction = "next", step) {
      if (n === 0) return null;
      if (direction === "first") return traversal[0]!;
      if (direction === "last") return traversal[n - 1]!;
      if (direction === "next" || direction === "previous") {
        if (startId !== null && (!Number.isInteger(startId) || startId < 0 || startId >= n))
          return traversal[0]!;
        // Preserve the original null-start contract when callers omit step.
        if (startId === null && step === undefined) return traversal[0]!;
        const resolvedStep = step ?? 1;
        if (!Number.isInteger(resolvedStep) || !Number.isFinite(resolvedStep)) return startId;
        const at = startId === null ? -1 : traversalRank[startId]!;
        const delta = direction === "next" ? resolvedStep : -resolvedStep;
        const next = (((at + delta) % n) + n) % n;
        return traversal[next]!;
      }
      if (startId === null) return traversal[0]!;
      if (!Number.isInteger(startId) || startId < 0 || startId >= n) return traversal[0]!;
      // left/right/up/down: O(log n + k) via panel-sorted primary axis indexes
      // (not a full O(n) scan). Same panel; min primary > 0; min orth; topmost id.
      const panel = panelIds[startId]!;
      if (direction === "left" || direction === "right") {
        const [panelStart, panelEnd] = panelRangeInOrder(orderByX, panelIds, panel);
        return directionalNearestInOrder(
          orderByX,
          xs,
          ys,
          panelStart,
          panelEnd,
          startId,
          xs[startId]!,
          ys[startId]!,
          direction === "right",
        );
      }
      // up/down: reuse traversal (panel → y → x → …).
      const [panelStart, panelEnd] = panelRangeInOrder(traversal, panelIds, panel);
      return directionalNearestInOrder(
        traversal,
        ys,
        xs,
        panelStart,
        panelEnd,
        startId,
        ys[startId]!,
        xs[startId]!,
        direction === "down",
      );
    },
    cycle(seedId, step = 1) {
      if (!Number.isInteger(seedId) || seedId < 0 || seedId >= n) return null;
      const stack = coincidentStack[seedId];
      // No multi-member stack → singleton; step is a no-op.
      if (stack === undefined) return seedId;
      const at = coincidentAt[seedId]!;
      const next = (((at + step) % stack.length) + stack.length) % stack.length;
      // Non-finite / non-integral step yields a non-element index; fall back to seed.
      return stack[next] ?? seedId;
    },
    queryRect(x0, y0, x1, y1, panelId) {
      const loX = Math.min(x0, x1);
      const hiX = Math.max(x0, x1);
      const loY = Math.min(y0, y1);
      const hiY = Math.max(y0, y1);
      if (spatial === null || n === 0) return EMPTY_UINT32;
      // Point anchors: exact rect membership via the tree. Extended geometry
      // (rects/segments/paths) can intersect far from the anchor — always refine.
      // Collect hits then order by traversal rank (preserves prior contract).
      const hits: number[] = [];
      for (const id of spatial.queryRect(loX, loY, hiX, hiY)) {
        if (isPoint[id] !== 1) continue;
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        hits.push(id);
      }
      const extendedHits: number[] = [];
      query.addExtendedIntersecting(loX, loY, hiX, hiY, extendedHits);
      for (const id of extendedHits) {
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        if (query.intersects(id, loX, loY, hiX, hiY)) hits.push(id);
      }
      hits.sort((a, b) => traversalRank[a]! - traversalRank[b]!);
      return Uint32Array.from(hits);
    },
    dispose() {},
  };
}
