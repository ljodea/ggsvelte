import type { ResolvedCandidateInspectMode } from "./candidate-store-types.js";
import type { GeometryBatch } from "./scene.js";

/**
 * Geometry-array topology for candidate indexes / hit refine:
 * - rects / segments: packed float arrays
 * - points / glyphs / paths: vertices (`positions.length / 2`)
 *
 * Distinct from {@link renderPrimitiveCount} (paint/focus marks) and
 * {@link candidatePrimitiveCount} (inspectable anchors).
 */
export function primitiveCount(batch: GeometryBatch): number {
  if (batch.kind === "rects") return batch.rects.length / 4;
  if (batch.kind === "segments") return batch.segments.length / 4;
  return batch.positions.length / 2;
}

/**
 * Paint / focus / mark-threshold address space (one count for canvas focus,
 * interaction masks, SVG mark totals, and backend auto threshold).
 * Paths count **subpaths**, not tessellated vertices.
 */
export function renderPrimitiveCount(batch: GeometryBatch): number {
  switch (batch.kind) {
    case "points":
    case "glyphs":
      return batch.rowIndex.length;
    case "paths":
      return Math.max(0, batch.pathOffsets.length - 1);
    case "rects":
      return batch.rects.length / 4;
    case "segments":
      return batch.segments.length / 4;
    default:
      return 0;
  }
}

export function isCandidatePrimitive(batch: GeometryBatch, primitiveIndex: number): boolean {
  return batch.kind !== "paths" || batch.semanticAnchors?.[primitiveIndex] !== 0;
}

export function candidatePrimitiveCount(batch: GeometryBatch): number {
  if (batch.kind !== "paths" || batch.semanticAnchors === undefined) return primitiveCount(batch);
  let count = 0;
  for (const anchor of batch.semanticAnchors) if (anchor !== 0) count++;
  return count;
}

export function localAnchor(batch: GeometryBatch, i: number): readonly [number, number] {
  if (batch.kind === "rects")
    return [batch.rects[i * 4]! + batch.rects[i * 4 + 2]! / 2, batch.rects[i * 4 + 1]!];
  if (batch.kind === "segments")
    return batch.anchorPositions === undefined
      ? [
          (batch.segments[i * 4]! + batch.segments[i * 4 + 2]!) / 2,
          (batch.segments[i * 4 + 1]! + batch.segments[i * 4 + 3]!) / 2,
        ]
      : [batch.anchorPositions[i * 2]!, batch.anchorPositions[i * 2 + 1]!];
  return [batch.positions[i * 2]!, batch.positions[i * 2 + 1]!];
}

export function defaultAutoMode(batch: GeometryBatch, i: number): ResolvedCandidateInspectMode {
  if (batch.kind === "rects") return "exact";
  if (batch.kind === "paths") return "x";
  if (batch.kind === "segments") {
    const dx = Math.abs(batch.segments[i * 4 + 2]! - batch.segments[i * 4]!);
    const dy = Math.abs(batch.segments[i * 4 + 3]! - batch.segments[i * 4 + 1]!);
    return dx <= dy ? "x" : "y";
  }
  return "xy";
}

export function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1,
    dy = y2 - y1,
    length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length2));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}

export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
): boolean {
  let enter = 0;
  let exit = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (const [p, q] of [
    [-dx, x1 - loX],
    [dx, hiX - x1],
    [-dy, y1 - loY],
    [dy, hiY - y1],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) enter = Math.max(enter, ratio);
    else exit = Math.min(exit, ratio);
    if (enter > exit) return false;
  }
  return true;
}

/**
 * Subpath index in `pathOffsets` for a vertex (0 .. subpathCount-1), or null.
 * Binary search on monotonic half-open spans — O(log P) vs linear O(P).
 * Fractional vertices allowed; zero-length spans never match.
 */
export function pathSubpathIndex(offsets: ArrayLike<number>, vertex: number): number | null {
  if (offsets.length < 2) return null;
  let low = 0;
  let high = offsets.length - 2;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const start = offsets[mid]!;
    const end = offsets[mid + 1]!;
    if (vertex < start) high = mid - 1;
    else if (vertex >= end) low = mid + 1;
    else return mid;
  }
  return null;
}

/**
 * Half-open subpath range [start, end) containing `vertex`, or null.
 * Binary search on monotonic pathOffsets — O(log P) vs linear O(P).
 * Preserves the linear-scan contract: fractional vertices are allowed;
 * zero-length spans never match.
 */
export function pathRange(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  vertex: number,
): readonly [number, number] | null {
  const offsets = batch.pathOffsets;
  const mid = pathSubpathIndex(offsets, vertex);
  if (mid === null) return null;
  return [offsets[mid]!, offsets[mid + 1]!] as const;
}

/** Render-vertex span between the nearest semantic anchors around `vertex`.
 * Returns inclusive endpoints [previousAnchor, nextAnchor]. */
export function pathSemanticNeighborRange(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  vertex: number,
): readonly [number, number] | null {
  const range = pathRange(batch, vertex);
  if (range === null) return null;
  if (batch.semanticAnchors === undefined) {
    return [Math.max(range[0], vertex - 1), Math.min(range[1] - 1, vertex + 1)];
  }
  let previous = vertex - 1;
  while (previous >= range[0] && batch.semanticAnchors[previous] === 0) previous--;
  if (previous < range[0]) previous = vertex;
  let next = vertex + 1;
  while (next < range[1] && batch.semanticAnchors[next] === 0) next++;
  if (next >= range[1]) next = vertex;
  return [previous, next];
}

/** True when a and b lie in the same half-open pathOffsets subpath. */
export function samePath(batch: GeometryBatch, a: number, b: number): boolean {
  if (batch.kind !== "paths") return false;
  const range = pathRange(batch, a);
  return range !== null && b >= range[0] && b < range[1];
}

/**
 * Whether `id` beats `bestId` for group() representative selection.
 * Matches the historical linear scan: min |orth-seed|, then higher batchId,
 * then lower source; full equality keeps the earlier (left) member.
 */
function betterOrthCandidate(
  id: number,
  bestId: number,
  orth: ArrayLike<number>,
  batchIds: ArrayLike<number>,
  sources: ArrayLike<number>,
  seedOrth: number,
): boolean {
  const distance = Math.abs(orth[id]! - seedOrth);
  const prior = Math.abs(orth[bestId]! - seedOrth);
  // NaN never improves (matches `distance < prior` being false for NaN).
  // ±Infinity distances compare equal and fall through to batch/source ties.
  if (Number.isNaN(distance)) return false;
  if (Number.isNaN(prior)) return true;
  if (distance < prior) return true;
  if (distance > prior) return false;
  if (batchIds[id]! > batchIds[bestId]!) return true;
  if (batchIds[id]! < batchIds[bestId]!) return false;
  return sources[id]! < sources[bestId]!;
}

/** Linear closest — used for non-finite seedOrth and as the full-tie contract. */
function closestOrthLinear(
  permutation: ArrayLike<number>,
  orth: ArrayLike<number>,
  batchIds: ArrayLike<number>,
  sources: ArrayLike<number>,
  start: number,
  end: number,
  seedOrth: number,
): number {
  let best = permutation[start]!;
  for (let cursor = start + 1; cursor < end; cursor++) {
    const id = permutation[cursor]!;
    if (betterOrthCandidate(id, best, orth, batchIds, sources, seedOrth)) best = id;
  }
  return best;
}

/**
 * Closest candidate in a series range already sorted by ascending orth, then
 * batchId, then source (CandidateStore group-bucket contract: constant rank /
 * layer / series within the range).
 *
 * Preference matches the historical linear scan:
 * 1. minimize |orth[id] - seedOrth|
 * 2. on equal distance: higher batchId wins
 * 3. still tied: lower source wins
 * 4. still tied: earlier index in the range (first duplicate)
 *
 * Complexity: O(log M + T) for finite seedOrth (lower_bound + equal-distance
 * run of size T). Non-finite seedOrth uses a linear pass so Infinity seeds
 * still apply batch/source ties among finite members.
 */
export function closestOrthInRange(
  permutation: ArrayLike<number>,
  orth: ArrayLike<number>,
  batchIds: ArrayLike<number>,
  sources: ArrayLike<number>,
  start: number,
  end: number,
  seedOrth: number,
  /** False when ranks (or other pre-orth keys) vary — range is not orth-sorted. */
  orthSorted: boolean = true,
): number {
  if (start >= end) {
    throw new RangeError("closestOrthInRange: empty range");
  }
  if (end - start === 1) return permutation[start]!;
  // NaN / ± seed, or rank-blocked range: linear scan (batch/source ties).
  if (!Number.isFinite(seedOrth) || !orthSorted) {
    return closestOrthLinear(permutation, orth, batchIds, sources, start, end, seedOrth);
  }

  // lower_bound: first index with orth >= seedOrth (JS: NaN/∞ comparisons
  // match Array sort used to build the range).
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (orth[permutation[mid]!]! < seedOrth) lo = mid + 1;
    else hi = mid;
  }

  // Probe the two candidates that straddle seedOrth to learn min distance.
  let bestId = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  const note = (id: number): void => {
    const distance = Math.abs(orth[id]! - seedOrth);
    if (!Number.isFinite(distance)) return;
    if (bestId < 0 || distance < bestDist) {
      bestId = id;
      bestDist = distance;
    }
  };
  if (lo > start) note(permutation[lo - 1]!);
  if (lo < end) note(permutation[lo]!);
  if (bestId < 0) {
    return closestOrthLinear(permutation, orth, batchIds, sources, start, end, seedOrth);
  }

  // Left edge of the equal-distance run (scan L→R so full ties keep first).
  let left =
    lo > start && Math.abs(orth[permutation[lo - 1]!]! - seedOrth) === bestDist
      ? lo - 1
      : lo < end
        ? lo
        : lo - 1;
  while (left > start) {
    const distance = Math.abs(orth[permutation[left - 1]!]! - seedOrth);
    if (distance !== bestDist) break;
    left--;
  }

  let best = permutation[left]!;
  for (let i = left + 1; i < end; i++) {
    const id = permutation[i]!;
    const distance = Math.abs(orth[id]! - seedOrth);
    if (distance !== bestDist) {
      // Sorted orth: once distance exceeds bestDist we are past the run.
      if (!Number.isFinite(distance) || distance > bestDist) break;
      continue;
    }
    if (betterOrthCandidate(id, best, orth, batchIds, sources, seedOrth)) best = id;
  }
  return best;
}

/**
 * Nearest candidate in one axis direction within a panel-sorted order.
 *
 * `order[panelStart, panelEnd)` must be sorted by ascending primary coordinate,
 * then paint order. Prefer min primary > 0 (strictly in-direction), then min
 * orthogonal distance, then higher id so topmost/later-painted marks win.
 *
 * Non-finite seed primary → return seedId (linear never updates from NaN primary).
 * Complexity: O(log n + k) probes into `order` for a finite seed (k = equal-primary run).
 *
 * Optional `onProbe` is for tests that count inspected order indices.
 */
export function directionalNearestInOrder(
  order: ArrayLike<number>,
  primary: ArrayLike<number>,
  orth: ArrayLike<number>,
  panelStart: number,
  panelEnd: number,
  startId: number,
  seedPrimary: number,
  seedOrth: number,
  /** true = increasing primary (right/down); false = decreasing (left/up). */
  forward: boolean,
  onProbe?: (orderIndex: number) => void,
): number {
  if (panelStart >= panelEnd) return startId;
  if (!Number.isFinite(seedPrimary)) return startId;

  // First candidate strictly in-direction via binary search (not a linear skip
  // over the seed's equal-primary run — that would be O(m) for dense stacks).
  let lo = panelStart;
  let hi = panelEnd;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    onProbe?.(mid);
    // forward: upper_bound (primary > seed); backward: lower_bound (primary >= seed)
    const value = primary[order[mid]!]!;
    if (forward ? value <= seedPrimary : value < seedPrimary) lo = mid + 1;
    else hi = mid;
  }
  const runStart = forward ? lo : lo - 1;
  if (forward) {
    if (runStart >= panelEnd) return startId;
  } else {
    if (runStart < panelStart) return startId;
    onProbe?.(runStart);
  }

  const targetPrimary = primary[order[runStart]!]!;
  if (!Number.isFinite(targetPrimary)) return startId;

  // Walk the equal-primary run (forward: ascending indices; backward: descending).
  let best = -1;
  let bestOrth = Number.POSITIVE_INFINITY;
  if (forward) {
    for (let i = runStart; i < panelEnd; i++) {
      onProbe?.(i);
      const id = order[i]!;
      if (primary[id]! !== targetPrimary) break;
      if (id === startId) continue;
      const o = Math.abs(orth[id]! - seedOrth);
      if (!Number.isFinite(o)) continue;
      if (best < 0 || o < bestOrth || (o === bestOrth && id > best)) {
        best = id;
        bestOrth = o;
      }
    }
  } else {
    for (let i = runStart; i >= panelStart; i--) {
      onProbe?.(i);
      const id = order[i]!;
      if (primary[id]! !== targetPrimary) break;
      if (id === startId) continue;
      const o = Math.abs(orth[id]! - seedOrth);
      if (!Number.isFinite(o)) continue;
      if (best < 0 || o < bestOrth || (o === bestOrth && id > best)) {
        best = id;
        bestOrth = o;
      }
    }
  }
  return best < 0 ? startId : best;
}

/** Panel half-open range [start, end) in an array sorted by panelId then … */
export function panelRangeInOrder(
  order: ArrayLike<number>,
  panelIds: ArrayLike<number>,
  panelId: number,
  onProbe?: (orderIndex: number) => void,
): readonly [number, number] {
  const n = order.length;
  // lower_bound panelId
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    onProbe?.(mid);
    if (panelIds[order[mid]!]! < panelId) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;
  hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    onProbe?.(mid);
    if (panelIds[order[mid]!]! <= panelId) lo = mid + 1;
    else hi = mid;
  }
  return [start, lo];
}

export function insidePath(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  start: number,
  end: number,
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (let i = start, j = end - 1; i < end; j = i++) {
    const xi = batch.positions[i * 2]!;
    const yi = batch.positions[i * 2 + 1]!;
    const xj = batch.positions[j * 2]!;
    const yj = batch.positions[j * 2 + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
