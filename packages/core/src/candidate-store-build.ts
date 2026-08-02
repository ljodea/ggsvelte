import {
  closestOrthInRange,
  directionalNearestInOrder,
  panelRangeInOrder,
} from "./candidate-geometry-nearest.js";
import { createHitGeometry } from "./candidate-hit-geometry.js";
import { resolveTopmostHit } from "./candidate-hit-resolve.js";
import { AUTO_MODES, buildCandidateStoreIndexes } from "./candidate-store-indexes.js";
import type { BucketBoundary, SeriesBoundary } from "./candidate-store-indexes.js";
import { buildSpatialIndex } from "./candidate-store-spatial-index.js";
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
 * - candidate-store-spatial-index.ts — spatial shortlist trees + shortlist APIs
 * - candidate-hit-geometry.ts — one ops table per mark kind; probe handles
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
  } = indexes;
  const hit = createHitGeometry(indexes);
  const query = buildSpatialIndex(indexes, hit);
  const { spatial, isPoint, pointBatchIndexes, isFilledPath, filledSpanStart, filledSpanEnd } =
    query;

  /**
   * Expand a filled-path subpath representative to the best candidate in its
   * span (#1342). Per-vertex autoMode / axis-token filters apply inside the
   * span (not only on the rep). Scans high→low id so exact (distance, orth)
   * ties keep the topmost candidate, matching the descending shortlist contract.
   * Never promote filled paths via containment hypot under auto (#770).
   */
  const bestFilledInSpan = (
    repId: number,
    isAuto: boolean,
    explicitMode: ResolvedCandidateInspectMode,
    px: number,
    py: number,
    maxDistance: number,
    probe: ReturnType<typeof hit.probePoint>,
  ): { id: number; distance: number; orth: number; mode: ResolvedCandidateInspectMode } | null => {
    const start = filledSpanStart[repId]!;
    const end = filledSpanEnd[repId]!;
    if (start < 0 || end <= start) return null;
    // Containment is identical for every vertex on the subpath — compute once
    // when any vertex may take exact mode.
    let contained: boolean | null = null;
    const isContained = (): boolean => {
      contained ??= probe.distance(repId) !== null;
      return contained;
    };
    // Under auto, exact-mode vertices (tier 1) beat axis-snap (tier 2) even when
    // farther — track tiers separately so a mixed-mode span cannot collapse
    // away the tier winner before the outer ranking sees it (#770 / Devin).
    let bestExactId = -1;
    let bestExactDistance = Infinity;
    let bestSnapId = -1;
    let bestSnapDistance = Infinity;
    let bestSnapOrth = Infinity;
    let bestSnapMode: ResolvedCandidateInspectMode = explicitMode;
    // Descending: first equal (distance, orth) wins → highest id (topmost).
    for (let id = end - 1; id >= start; id--) {
      const candidateMode = isAuto ? AUTO_MODES[autoModes[id]!]! : explicitMode;
      if (
        (candidateMode === "x" && xTokenIds[id] === -1) ||
        (candidateMode === "y" && yTokenIds[id] === -1)
      )
        continue;
      let distance: number;
      let orth: number;
      if (candidateMode === "exact") {
        if (!isContained()) continue;
        distance = Math.hypot(xs[id]! - px, ys[id]! - py);
        orth = 0;
        if (distance < bestExactDistance) {
          bestExactId = id;
          bestExactDistance = distance;
        }
        // Explicit exact ranks among exact vertices only (via bestExact*).
        // Under auto, exact is tier-1 and returned below; skip snap ranking.
        continue;
      }
      if (candidateMode === "x") {
        distance = Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px));
        if (distance > maxDistance) continue;
        orth = Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py));
      } else if (candidateMode === "y") {
        distance = Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py));
        if (distance > maxDistance) continue;
        orth = Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px));
      } else {
        distance = Math.hypot(xs[id]! - px, ys[id]! - py);
        if (distance > maxDistance) continue;
        orth = 0;
      }
      if (distance < bestSnapDistance || (distance === bestSnapDistance && orth < bestSnapOrth)) {
        bestSnapId = id;
        bestSnapDistance = distance;
        bestSnapOrth = orth;
        bestSnapMode = candidateMode;
      }
    }
    // Prefer exact when auto (tier 1) or when explicit mode is exact.
    if (bestExactId >= 0 && (isAuto || explicitMode === "exact")) {
      return {
        id: bestExactId,
        distance: bestExactDistance,
        orth: 0,
        mode: "exact",
      };
    }
    return bestSnapId < 0
      ? null
      : {
          id: bestSnapId,
          distance: bestSnapDistance,
          orth: bestSnapOrth,
          mode: bestSnapMode,
        };
  };
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
          filledSpanStart,
          filledSpanEnd,
          isFilledPath,
          addExtendedIntersecting: (loX, loY, hiX, hiY, into) => {
            query.addExtendedIntersecting(loX, loY, hiX, hiY, into);
          },
          probePoint: (x, y) => hit.probePoint(x, y),
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
      // Under auto, exact-mode geometric hits (tier 1) beat pure axis-snap
      // candidates (tier 2). Prevents path/smooth x-crosshair from stealing
      // co-layered point hits (#770). Explicit mode is un-tiered.
      let bestGeometric = false;
      const isAuto = search.mode === "auto";
      // Ternary must compare search.mode directly so TS narrows away "auto".
      const mode: ResolvedCandidateInspectMode = search.mode === "auto" ? "exact" : search.mode;
      let resultMode: ResolvedCandidateInspectMode = mode;
      const probe = hit.probePoint(px, py);
      // When spatial is null (n===0) shortlistNearest returns []. Empty scenes
      // have nothing to scan; non-empty always builds a tree (or filled-only
      // trees that still shortlist via extended).
      const ids = query.shortlistNearest(px, py, search.mode, search.maxDistance);
      for (const id of ids) {
        if (search.panelId !== undefined && scene.panels[panelIds[id]!]!.id !== search.panelId)
          continue;

        // Filled-path shortlist entries are subpath reps (#1342) — expand with
        // per-vertex mode/token filters before global ranking.
        if (isFilledPath[id] === 1) {
          // Only process the representative once (span start equals rep id).
          if (filledSpanStart[id] !== id) continue;
          const expanded = bestFilledInSpan(id, isAuto, mode, px, py, search.maxDistance, probe);
          if (expanded === null) continue;
          // Exact-mode vertices in a filled span are rare (override datum);
          // default filled autoMode is "x" (tier 2) — do not promote via
          // containment hypot under auto (#770).
          const geometric = isAuto && expanded.mode === "exact";
          if (isAuto) {
            if (geometric && !bestGeometric) {
              best = expanded.id;
              bestDistance = expanded.distance;
              bestOrth = expanded.orth;
              resultMode = expanded.mode;
              bestGeometric = true;
              continue;
            }
            if (!geometric && bestGeometric) continue;
          }
          if (
            expanded.distance < bestDistance ||
            (expanded.distance === bestDistance && expanded.orth < bestOrth)
          ) {
            best = expanded.id;
            bestDistance = expanded.distance;
            bestOrth = expanded.orth;
            resultMode = expanded.mode;
            if (isAuto) bestGeometric = geometric;
          }
          continue;
        }

        const candidateMode = isAuto ? AUTO_MODES[autoModes[id]!]! : mode;
        if (
          (candidateMode === "x" && xTokenIds[id] === -1) ||
          (candidateMode === "y" && yTokenIds[id] === -1)
        )
          continue;

        const distance =
          candidateMode === "exact"
            ? probe.distance(id)
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
        // Tier 1 = exact-mode candidates with a finite exactDistance only.
        // Do not promote x/y candidates via stroke geometry (filled areas
        // return unbounded containment hypot; Claude plan review #770).
        const geometric = isAuto && candidateMode === "exact";
        if (isAuto) {
          if (geometric && !bestGeometric) {
            best = id;
            bestDistance = distance;
            bestOrth = orth;
            resultMode = candidateMode;
            bestGeometric = true;
            continue;
          }
          if (!geometric && bestGeometric) continue;
        }
        if (distance < bestDistance || (distance === bestDistance && orth < bestOrth)) {
          best = id;
          bestDistance = distance;
          bestOrth = orth;
          resultMode = candidateMode;
          if (isAuto) bestGeometric = geometric;
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
      // Axis-group tables build lazily — group() is their only consumer, so
      // first-hover sessions never pay the token sort / bucket walk.
      const { permutations, buckets } = indexes.axisGroups();
      // Numeric composite key mirrors the build side (panel * tokenCount + tokenId).
      const tuple: BucketBoundary | undefined = buckets[axis].get(
        panel * Math.max(tokens.length, 1) + key,
      );
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
      if (n === 0) return EMPTY_UINT32;
      // Point anchors: exact rect membership via the tree. Extended geometry
      // (rects/segments/paths) can intersect far from the anchor — always refine.
      // Collect hits then order by traversal rank (preserves prior contract).
      const hits: number[] = [];
      if (spatial !== null) {
        for (const id of spatial.queryRect(loX, loY, hiX, hiY)) {
          if (isPoint[id] !== 1) continue;
          if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
          hits.push(id);
        }
      }
      const extendedHits: number[] = [];
      query.addExtendedIntersecting(loX, loY, hiX, hiY, extendedHits);
      const probe = hit.probeRect(loX, loY, hiX, hiY);
      for (const id of extendedHits) {
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        // Filled subpath: one AABB shortlist entry, then per-vertex membership
        // (anchor / adjacent edges / fill-center). Do not expand the whole
        // span from a rep-only graze — that over-selects and under-selects
        // mid-band brushes (Devin review on #1342).
        if (isFilledPath[id] === 1) {
          const start = filledSpanStart[id]!;
          const end = filledSpanEnd[id]!;
          for (let cid = start; cid < end; cid++) {
            if (probe.intersects(cid)) hits.push(cid);
          }
          continue;
        }
        if (probe.intersects(id)) hits.push(id);
      }
      hits.sort((a, b) => traversalRank[a]! - traversalRank[b]!);
      return Uint32Array.from(hits);
    },
    dispose() {},
  };
}
