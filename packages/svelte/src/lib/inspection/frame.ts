/**
 * Pure decision tables for capture-surface inspection *frame* policy:
 * pointer-move queue payloads and onPointerFrame routing.
 * Callers own queue mutation and setInspection side effects.
 */

import type { CandidateFacts, CandidateMatch } from "@ggsvelte/core";

import type { InteractionSource } from "../interaction/interaction.js";
import { hitFromCandidate, type SceneHit } from "../surface/plot-px.js";

/** Host inspection lifecycle state used across pure inspection tables. */
export type InspectionHostState = "none" | "transient" | "pinned";

/**
 * Host queue payload for pointer-move / touch-inspect frames and pending pin restore.
 * `concreteMode` + `candidate` are coupled: both present only when nearest match exists.
 */
export type QueuedPointerInspection = {
  hit: SceneHit | null;
  source: InteractionSource;
  concreteMode?: "exact" | "x" | "y" | "xy";
  candidate?: CandidateFacts;
};

/**
 * Build the queued pointer-inspect payload.
 * Match is a single object: mode and candidate always come from the same nearest hit.
 */
export function buildQueuedPointerInspection(input: {
  readonly hit: SceneHit | null;
  readonly source: InteractionSource;
  readonly match: CandidateMatch | null;
}): QueuedPointerInspection {
  if (input.match === null) {
    return { hit: input.hit, source: input.source };
  }
  return {
    hit: input.hit,
    source: input.source,
    concreteMode: input.match.mode,
    candidate: input.match,
  };
}

/**
 * Cohesive queue-inspect frame payload for host `onPointerMove` queue-inspect.
 *
 * Owns the single `match === null` branch for hit resolution + reducer
 * candidate ref (avoids three separate null checks / eager hitTest).
 * `fallbackCandidate` and `panelIdForIndex` are thunks evaluated only on the
 * path that needs them.
 */
export type QueuedInspectFrameBuild = {
  readonly queued: QueuedPointerInspection;
  readonly candidate: InspectionCandidateRef | null;
};

export function buildQueuedInspectFrame(input: {
  readonly match: CandidateMatch | null;
  readonly source: InteractionSource;
  readonly epoch: number;
  /** Evaluated only when match is null. */
  readonly fallbackCandidate: () => CandidateFacts | null;
  /** Evaluated only when a candidate is found. */
  readonly panelIdForIndex: (panelIndex: number) => string | null;
}): QueuedInspectFrameBuild {
  if (input.match === null) {
    const fallback = input.fallbackCandidate();
    if (fallback === null)
      return {
        queued: { hit: null, source: input.source },
        candidate: null,
      };
    const hit = hitFromCandidate(fallback);
    return {
      queued: { hit, source: input.source, candidate: fallback },
      candidate: {
        epoch: input.epoch,
        id: fallback.id,
        panelId: input.panelIdForIndex(fallback.panelIndex),
        x: fallback.x,
        y: fallback.y,
      },
    };
  }
  const match = input.match;
  const hit = hitFromCandidate(match);
  return {
    queued: buildQueuedPointerInspection({
      hit,
      source: input.source,
      match,
    }),
    candidate: {
      epoch: input.epoch,
      id: match.id,
      panelId: input.panelIdForIndex(match.panelIndex),
      x: match.x,
      y: match.y,
    },
  };
}

export type QueuedInspectFrameInput = {
  /** True when a snapshotted `queuedPointerInspection` payload exists. */
  readonly hasPending: boolean;
  /**
   * Host: `token === null || reducer.accepts(token)`.
   * Compute only after confirming a pending payload exists (or short-circuit
   * so `reducer.accepts` is not called when `hasPending` is false).
   */
  readonly tokenAccepted: boolean;
  /** Current host inspection: null → `"none"`, else `inspection.state`. */
  readonly currentState: InspectionHostState;
  /**
   * Host: `action.candidate !== null && action.candidate.epoch !== model?.runId`
   * from the reducer frame action (not the queued candidate snapshot).
   * When the frame action has no candidate, pass false.
   */
  readonly candidateEpochMismatch: boolean;
};

export type QueuedInspectFrameAction =
  | { readonly type: "none" }
  | { readonly type: "drop" }
  | { readonly type: "stash-pending" }
  | { readonly type: "apply-pending" };

/**
 * Pure decision for the inspect branch of `onPointerFrame` after the host
 * has snapshotted and cleared queue fields.
 *
 * Priority (matches current host):
 *   1. none — !hasPending
 *   2. drop — !tokenAccepted (stale frame token)
 *   3. stash-pending — currentState === "pinned"
 *   4. drop — candidateEpochMismatch
 *   5. apply-pending
 *
 * Host sequencing: snapshot pending + token, clear `queuedPointerInspection`
 * and `queuedPointerToken`, then call this helper, then switch:
 *   none/drop → return
 *   stash-pending → `pendingPinnedPointer = pending`
 *   apply-pending → `setInspection(pending…, "transient", …)`
 */
export function resolveQueuedInspectFrameAction(
  input: QueuedInspectFrameInput,
): QueuedInspectFrameAction {
  if (!input.hasPending) return { type: "none" };
  if (!input.tokenAccepted) return { type: "drop" };
  if (input.currentState === "pinned") return { type: "stash-pending" };
  if (input.candidateEpochMismatch) return { type: "drop" };
  return { type: "apply-pending" };
}

/** Reducer inspect payload candidate (matches InteractionCandidateRef shape). */
type InspectionCandidateRef = {
  readonly epoch: number;
  readonly id: number;
  readonly panelId: string | null;
  readonly x: number;
  readonly y: number;
};
