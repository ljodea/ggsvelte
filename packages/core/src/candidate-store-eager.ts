import {
  pathRange,
  pathSemanticNeighborRange,
  pathSubpathIndex,
  pointHitDistance,
} from "./candidate-geometry.js";
import {
  closestOrthInRange,
  directionalNearestInOrder,
  panelRangeInOrder,
} from "./candidate-geometry-nearest.js";
import { closestPathEdge } from "./candidate-path-geometry.js";
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
 * Eager candidate store: compact indexes + query methods.
 * Construction is split across:
 * - candidate-store-indexes.ts — typed arrays, traversal, group buckets
 * - candidate-store-spatial.ts — spatial shortlist + geometry refine (index + refine)
 * - candidate-path-geometry.ts — path AABB / edge helpers
 */
export function buildCandidateStoreEager(
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
      let best = -1;
      let bestBatch = -1;
      let bestDistance = Infinity;
      let bestPathStart = -1;
      let bestPathEdge = Infinity;
      const pathContainment = new Map<string, boolean>();

      for (let index = pointBatchIndexes.length - 1; index >= 0; index--) {
        const entry = pointBatchIndexes[index]!;
        const batch = scene.batches[entry.batchIndex]!;
        if (batch.kind !== "points") continue;
        const panel = scene.panels[batch.panelIndex];
        if (
          panel === undefined ||
          (panel.clip !== false &&
            (px < panel.x ||
              px > panel.x + panel.width ||
              py < panel.y ||
              py > panel.y + panel.height))
        )
          continue;
        let maxRadius = batch.size;
        if (batch.sizes !== undefined) {
          for (const radius of batch.sizes) maxRadius = Math.max(maxRadius, radius);
        }
        maxRadius *= 1.25;
        const localIds = entry.spatial
          .queryRect(
            px - maxRadius - hitTolerance,
            py - maxRadius - hitTolerance,
            px + maxRadius + hitTolerance,
            py + maxRadius + hitTolerance,
          )
          .toSorted((a, b) => b - a);
        for (const localId of localIds) {
          const candidateId = entry.ids[localId]!;
          const primitive = primitiveIds[candidateId]!;
          const distance = pointHitDistance(
            batch,
            primitive,
            xs[candidateId]! - px,
            ys[candidateId]! - py,
            hitTolerance,
          );
          if (distance === null) continue;
          best = candidateId;
          bestBatch = entry.batchIndex;
          bestDistance = distance;
          break;
        }
        if (best >= 0) break;
      }

      const extended: number[] = [];
      query.addExtendedIntersecting(px, py, px, py, extended);
      extended.sort((a, b) => b - a);
      for (const id of extended) {
        const batchIndex = batchIds[id]!;
        if (batchIndex < bestBatch) continue;
        const batch = scene.batches[batchIndex]!;
        if (batch.kind === "glyphs") continue;
        const panel = scene.panels[panelIds[id]!]!;
        if (
          panel.clip !== false &&
          (px < panel.x ||
            px > panel.x + panel.width ||
            py < panel.y ||
            py > panel.y + panel.height)
        )
          continue;
        const distance = query.exactDistance(id, px, py, pathContainment);
        if (distance === null) continue;
        const sameBatch = batchIndex === bestBatch;
        const primitive = primitiveIds[id]!;
        const range = batch.kind === "paths" ? pathRange(batch, primitive) : null;
        const pathStart = range?.[0] ?? -1;
        let pathEdge = Infinity;
        let candidateId = id;
        let anchorDistance = Math.hypot(xs[id]! - px, ys[id]! - py);
        if (batch.kind === "paths" && batch.fills === undefined && range !== null) {
          const localX = px - panel.x;
          const localY = py - panel.y;
          const subpath = pathSubpathIndex(batch.pathOffsets, primitive);
          const slop =
            (subpath === null
              ? batch.linewidth
              : (batch.linewidths?.[subpath] ?? batch.linewidth)) /
              2 +
            hitTolerance;
          pathEdge = closestPathEdge(
            batch,
            pathSemanticNeighborRange(batch, primitive),
            localX,
            localY,
            slop,
          );
          if (!Number.isFinite(pathEdge)) continue;
          if (batch.semanticAnchors === undefined) {
            // Preserve the historical stable edge contract: an equidistant
            // ordinary path edge resolves to its first render vertex.
            const firstDistance = Math.hypot(
              batch.positions[pathEdge * 2]! - localX,
              batch.positions[pathEdge * 2 + 1]! - localY,
            );
            const secondDistance = Math.hypot(
              batch.positions[(pathEdge + 1) * 2]! - localX,
              batch.positions[(pathEdge + 1) * 2 + 1]! - localY,
            );
            const chosenPrimitive = firstDistance <= secondDistance ? pathEdge : pathEdge + 1;
            candidateId = id - primitive + chosenPrimitive;
            anchorDistance = Math.min(firstDistance, secondDistance);
          } else {
            // Synthetic render vertices never become candidates. Competing
            // semantic anchors that own this tessellated edge are compared by
            // anchor distance in the normal within-batch tie break below.
            candidateId = id;
            anchorDistance = Math.hypot(xs[id]! - px, ys[id]! - py);
          }
        }
        const nearerTessellatedAnchor =
          batch.kind === "paths" &&
          batch.semanticAnchors !== undefined &&
          pathEdge === bestPathEdge &&
          (anchorDistance < bestDistance ||
            (anchorDistance === bestDistance &&
              primitive < (best < 0 ? Infinity : primitiveIds[best]!)));
        const improvesWithinBatch =
          batch.kind === "paths"
            ? pathStart > bestPathStart ||
              (pathStart === bestPathStart &&
                (batch.fills === undefined
                  ? pathEdge < bestPathEdge || nearerTessellatedAnchor
                  : anchorDistance < bestDistance ||
                    (anchorDistance === bestDistance &&
                      primitive < (best < 0 ? Infinity : primitiveIds[best]!))))
            : primitive > (best < 0 ? -1 : primitiveIds[best]!);
        if (batchIndex > bestBatch || (sameBatch && improvesWithinBatch)) {
          best = candidateId;
          bestBatch = batchIndex;
          bestDistance = batch.kind === "paths" ? anchorDistance : distance;
          bestPathStart = pathStart;
          bestPathEdge = pathEdge;
        }
      }
      return indexes.fact(best);
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
