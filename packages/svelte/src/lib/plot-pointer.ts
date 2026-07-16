import type { CandidateFacts } from "@ggsvelte/core";
import type { SceneHit } from "@ggsvelte/core/dom";

export type ClientRectSize = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type SceneSize = {
  readonly width: number;
  readonly height: number;
};

/** Map a client pointer position into plot/scene coordinates. Zero-size
 *  targets return the origin; out-of-bounds clients are intentionally not
 *  clamped (callers may drag past the capture edge). */
export function plotPointFromClient(
  clientX: number,
  clientY: number,
  rect: ClientRectSize,
  scene: SceneSize,
): { x: number; y: number } {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * scene.width,
    y: ((clientY - rect.top) / rect.height) * scene.height,
  };
}

/** Project a candidate into the SceneHit shape used by hit indexes/overlays. */
export function hitFromCandidate(candidate: CandidateFacts): SceneHit {
  return {
    layerIndex: candidate.layerIndex,
    panelIndex: candidate.panelIndex,
    rowIndex: candidate.rowIndex,
    x: candidate.x,
    y: candidate.y,
    kind: candidate.kind,
  };
}

/** Pixel tolerance for matching a hit back to a stored candidate (both axes). */
export const CANDIDATE_HIT_TOLERANCE = 0.5;

/**
 * Find the first candidate matching a SceneHit identity + proximity.
 * Iteration order is caller-owned (production walks id-ascending).
 * Tolerance is exclusive: |Δ| < tol matches; |Δ| === tol does not.
 */
export function matchCandidateFromHit(
  candidates: Iterable<CandidateFacts>,
  hit: SceneHit,
  tolerance: number = CANDIDATE_HIT_TOLERANCE,
): CandidateFacts | null {
  for (const candidate of candidates) {
    if (
      candidate.layerIndex === hit.layerIndex &&
      candidate.panelIndex === hit.panelIndex &&
      candidate.rowIndex === hit.rowIndex &&
      candidate.kind === hit.kind &&
      Math.abs(candidate.x - hit.x) < tolerance &&
      Math.abs(candidate.y - hit.y) < tolerance
    )
      return candidate;
  }
  return null;
}

/**
 * Narrow candidate-store surface for keyboard/inspection traversal.
 * Production walks id-ascending via traverse(null,"first") / traverse(id,"next").
 */
export type TraversalCandidateStore = {
  traverse(fromId: number | null, direction: "first" | "next"): number | null;
  candidate(id: number): CandidateFacts | null;
};

/**
 * Build the ordered SceneHit list used by keyboard navigation.
 * Stops on cycle (duplicate id) or null terminator; skips missing candidates.
 */
export function buildTraversalHits(store: TraversalCandidateStore): SceneHit[] {
  const hits: SceneHit[] = [];
  let id = store.traverse(null, "first");
  const seen = new Set<number>();
  while (id !== null && !seen.has(id)) {
    seen.add(id);
    const candidate = store.candidate(id);
    if (candidate !== null) hits.push(hitFromCandidate(candidate));
    id = store.traverse(id, "next");
  }
  return hits;
}

/** Modular wrap for keyboard traversal across a hit list. */
export function nextTraversalIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  return (current + delta + length) % length;
}

/**
 * Pick the best hit in direction (dx, dy) from origin.
 * Score = primary + 2 * |orthogonal|; ties keep the later traversal index
 * (matches topmost/later paint order used by pointer hit testing).
 * Returns -1 when no forward candidate exists.
 */
export function bestDirectionalIndex(
  origin: Readonly<{ x: number; y: number }>,
  hits: readonly Readonly<{ x: number; y: number }>[],
  dx: number,
  dy: number,
): number {
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 0; index < hits.length; index++) {
    const hit = hits[index]!;
    const horizontal = hit.x - origin.x;
    const vertical = hit.y - origin.y;
    const primary = horizontal * dx + vertical * dy;
    if (primary <= 0) continue;
    const orthogonal = Math.abs(horizontal * dy - vertical * dx);
    const score = primary + orthogonal * 2;
    // Equal scores overwrite → later traversal order wins.
    if (score > bestScore) continue;
    bestScore = score;
    bestIndex = index;
  }
  return bestIndex;
}

/**
 * Cycle among hits coincident with origin (within < 0.5 px on both axes).
 * When activeIndex is not among them, starts as if at the first coincident
 * entry (Math.max(0, -1) = 0). Returns -1 when fewer than two matches.
 */
export function cycleCoincidentIndex(
  origin: Readonly<{ x: number; y: number }>,
  hits: readonly Readonly<{ x: number; y: number }>[],
  activeIndex: number,
  delta: number,
): number {
  const coincident = hits
    .map((hit, index) => ({ hit, index }))
    .filter(({ hit }) => Math.abs(hit.x - origin.x) < 0.5 && Math.abs(hit.y - origin.y) < 0.5);
  if (coincident.length < 2) return -1;
  const current = Math.max(
    0,
    coincident.findIndex(({ index }) => index === activeIndex),
  );
  const next = coincident[(current + delta + coincident.length) % coincident.length]!;
  return next.index;
}

// ---- host traversal step plans ----

export type TraversalStepPlan =
  | { readonly type: "none" }
  | { readonly type: "set-index"; readonly index: number };

/**
 * Directional keyboard navigation (arrow keys).
 *
 * - empty hits → none
 * - no live inspection → advance from currentIndex by +1 (host `navigate(1)`)
 * - with inspection → `bestIndex()` (thunk so host skips anchor work when uninspected)
 *   and none when the thunk returns a negative index
 */
export function planDirectionalNavigate(input: {
  readonly hitCount: number;
  readonly hasInspection: boolean;
  readonly currentIndex: number;
  /** Evaluated only when hasInspection. */
  readonly bestIndex: () => number;
}): TraversalStepPlan {
  if (input.hitCount <= 0) return { type: "none" };
  if (!input.hasInspection) {
    const index = nextTraversalIndex(input.currentIndex, 1, input.hitCount);
    return index < 0 ? { type: "none" } : { type: "set-index", index };
  }
  const best = input.bestIndex();
  if (best < 0) return { type: "none" };
  return { type: "set-index", index: best };
}

/**
 * Coincident cycle (`[` / `]`).
 *
 * - no live inspection → advance from currentIndex by +1 (same as navigate(1))
 * - with inspection → `nextIndex()` thunk; none when negative
 *
 * Host `cycleCoincident` has no empty-list guard; empty hits yield none via
 * nextTraversalIndex / negative nextIndex.
 */
export function planCycleCoincident(input: {
  readonly hasInspection: boolean;
  readonly hitCount: number;
  readonly currentIndex: number;
  /** Evaluated only when hasInspection. */
  readonly nextIndex: () => number;
}): TraversalStepPlan {
  if (!input.hasInspection) {
    if (input.hitCount <= 0) return { type: "none" };
    const index = nextTraversalIndex(input.currentIndex, 1, input.hitCount);
    return index < 0 ? { type: "none" } : { type: "set-index", index };
  }
  const next = input.nextIndex();
  if (next < 0) return { type: "none" };
  return { type: "set-index", index: next };
}
