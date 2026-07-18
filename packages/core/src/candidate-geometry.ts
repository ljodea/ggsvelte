import type { ResolvedCandidateInspectMode } from "./candidate-store-types.js";
import type { GeometryBatch } from "./scene.js";

export function primitiveCount(batch: GeometryBatch): number {
  if (batch.kind === "rects") return batch.rects.length / 4;
  if (batch.kind === "segments") return batch.segments.length / 4;
  return batch.positions.length / 2;
}

export function localAnchor(batch: GeometryBatch, i: number): readonly [number, number] {
  if (batch.kind === "rects")
    return [batch.rects[i * 4]! + batch.rects[i * 4 + 2]! / 2, batch.rects[i * 4 + 1]!];
  if (batch.kind === "segments")
    return [
      (batch.segments[i * 4]! + batch.segments[i * 4 + 2]!) / 2,
      (batch.segments[i * 4 + 1]! + batch.segments[i * 4 + 3]!) / 2,
    ];
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
  if (offsets.length < 2) return null;
  let low = 0;
  let high = offsets.length - 2;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const start = offsets[mid]!;
    const end = offsets[mid + 1]!;
    if (vertex < start) high = mid - 1;
    else if (vertex >= end) low = mid + 1;
    else return [start, end] as const;
  }
  return null;
}

/** True when a and b lie in the same half-open pathOffsets subpath. */
export function samePath(batch: GeometryBatch, a: number, b: number): boolean {
  if (batch.kind !== "paths") return false;
  const range = pathRange(batch, a);
  return range !== null && b >= range[0] && b < range[1];
}

/**
 * Closest candidate in a series range already sorted by ascending orth, then
 * batchId, then source (CandidateStore group-bucket contract).
 *
 * Preference matches the historical linear scan:
 * 1. minimize |orth[id] - seedOrth|
 * 2. on equal distance: higher batchId wins
 * 3. still tied: lower source wins
 *
 * Complexity: O(log M + T) for finite seedOrth (lower_bound + expand the
 * equal-distance run of size T). Non-finite seedOrth falls back to the first
 * id — same as the linear scan when every |Δ| is NaN and never improves.
 */
export function closestOrthInRange(
  permutation: ArrayLike<number>,
  orth: ArrayLike<number>,
  batchIds: ArrayLike<number>,
  sources: ArrayLike<number>,
  start: number,
  end: number,
  seedOrth: number,
): number {
  if (start >= end) {
    throw new RangeError("closestOrthInRange: empty range");
  }
  if (end - start === 1 || !Number.isFinite(seedOrth)) return permutation[start]!;

  // lower_bound: first index with finite orth >= seedOrth (non-finite orth
  // sorts as "less than" so the bound still lands among usable values).
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const value = orth[permutation[mid]!]!;
    if (!Number.isFinite(value) || value < seedOrth) lo = mid + 1;
    else hi = mid;
  }

  let bestId = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  const consider = (id: number): void => {
    const distance = Math.abs(orth[id]! - seedOrth);
    if (!Number.isFinite(distance)) return;
    if (
      bestId < 0 ||
      distance < bestDist ||
      (distance === bestDist &&
        (batchIds[id]! > batchIds[bestId]! ||
          (batchIds[id] === batchIds[bestId] && sources[id]! < sources[bestId]!)))
    ) {
      bestId = id;
      bestDist = distance;
    }
  };

  if (lo > start) consider(permutation[lo - 1]!);
  if (lo < end) consider(permutation[lo]!);
  if (bestId < 0) return permutation[start]!;

  // Expand equal-distance runs left of lo-1 and right of lo (sorted orth).
  for (let i = lo - 2; i >= start; i--) {
    const id = permutation[i]!;
    const distance = Math.abs(orth[id]! - seedOrth);
    if (!Number.isFinite(distance) || distance > bestDist) break;
    consider(id);
  }
  for (let i = lo + 1; i < end; i++) {
    const id = permutation[i]!;
    const distance = Math.abs(orth[id]! - seedOrth);
    if (!Number.isFinite(distance) || distance > bestDist) break;
    consider(id);
  }
  return bestId;
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
