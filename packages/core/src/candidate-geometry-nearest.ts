/**
 * Orthogonal + directional nearest navigation over candidate-store orders.
 *
 * Extracted from candidate-geometry.ts (#534): primitive/segment/path algebra
 * stays there; this module owns panel-range and orth/directional nearest picks
 * used by CandidateStore group() and arrow traversal.
 */

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
