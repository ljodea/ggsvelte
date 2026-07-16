/**
 * Pure decision tables for capture-surface inspection host policy.
 * Callers own queue mutation, setInspection, and reducer side effects.
 */

import type { InteractionSource } from "./interaction.js";

type InspectionHostState = "none" | "transient" | "pinned";

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

/**
 * Whether the host should clear the sticky live-region announcement text
 * before routing a setInspection request.
 *
 * Host calls this **unconditionally before** `resolveSetInspectionAction`,
 * including when the later action is `ignore` (e.g. keyboard transient
 * while pinned still clears the announcement).
 */
export function shouldClearInspectionAnnouncement(input: {
  readonly hasHit: boolean;
  readonly source: InteractionSource;
}): boolean {
  return input.hasHit && (input.source === "keyboard" || input.source === "touch");
}

export type SetInspectionInput = {
  readonly hasHit: boolean;
  readonly requestedState: "transient" | "pinned";
  /** Host: `inspection === null ? "none" : inspection.state`. */
  readonly currentState: InspectionHostState;
  readonly tooltipHovered: boolean;
};

export type SetInspectionAction =
  | { readonly type: "ignore" }
  | { readonly type: "clear" }
  | { readonly type: "apply" };

/**
 * Pure decision for the start of host `setInspection`.
 *
 * Priority (matches current host):
 *   1. ignore — current pinned + requested transient
 *   2. ignore — !hasHit && (tooltipHovered || current pinned)
 *   3. clear — !hasHit
 *   4. apply — hasHit
 *
 * Host note: `apply` is not terminal. After resolve, a null coordinator
 * result re-enters via `setInspection(null, source)` (default transient),
 * re-running these gates. Host still owns resolve, reducer, emit, and
 * the post-dispatch `shouldCommitInspection` gate.
 */
export function resolveSetInspectionAction(input: SetInspectionInput): SetInspectionAction {
  if (input.currentState === "pinned" && input.requestedState === "transient")
    return { type: "ignore" };
  if (!input.hasHit) {
    if (input.tooltipHovered || input.currentState === "pinned") return { type: "ignore" };
    return { type: "clear" };
  }
  return { type: "apply" };
}

/**
 * After reducer inspect (+ optional toggle-pin) dispatch for an apply path,
 * whether the host should commit the resolved snapshot into inspection state.
 * Host: when false, return without mutating inspection / seed / emit.
 */
export function shouldCommitInspection(input: {
  readonly requestedState: "transient" | "pinned";
  /** Host: `reducer.state.inspection.kind` after dispatch. */
  readonly reducerKind: string;
}): boolean {
  if (input.requestedState === "transient" && input.reducerKind !== "transient") return false;
  if (input.requestedState === "pinned" && input.reducerKind !== "pinned") return false;
  return true;
}

/** Reducer inspect payload candidate (matches InteractionCandidateRef shape). */
export type InspectionCandidateRef = {
  readonly epoch: number;
  readonly id: number;
  readonly panelId: string | null;
  readonly x: number;
  readonly y: number;
};

/**
 * Build the inspect-dispatch candidate ref for setInspection apply.
 * `fallbackId` is a thunk so hosts can defer `traversalHits.indexOf(hit)`
 * until `candidateId` is actually missing (hot pointer path).
 */
export function buildInspectionCandidateRef(input: {
  readonly epoch: number;
  readonly candidateId: number | undefined;
  readonly fallbackId: () => number;
  readonly panelId: string | null;
  readonly x: number;
  readonly y: number;
}): InspectionCandidateRef {
  return {
    epoch: input.epoch,
    id: input.candidateId ?? input.fallbackId(),
    panelId: input.panelId,
    x: input.x,
    y: input.y,
  };
}

export type ToggleInspectionPinInput = {
  readonly hasInspection: boolean;
  readonly hasSeed: boolean;
  /** Host: current inspection.state when hasInspection. */
  readonly currentState: "transient" | "pinned";
  readonly hasPendingPinned: boolean;
};

export type ToggleInspectionPinAction =
  | { readonly type: "ignore" }
  | { readonly type: "restore-pending" }
  | { readonly type: "flip-to-transient" }
  | { readonly type: "flip-to-pinned" };

/**
 * Pure decision for host `toggleInspectionPin` after the null-seed guard.
 *
 * Host sequencing (preserve exactly):
 *   1. if ignore → return (no reducer dispatch)
 *   2. always `reducer.dispatch({ type: "toggle-pin", source })` first
 *   3. restore-pending → release pinned, clear fields, setInspection(pending…)
 *   4. flip → resolveInspection; if null return with reducer already toggled
 *      (host does not roll back reducer state)
 */
export function resolveToggleInspectionPinAction(
  input: ToggleInspectionPinInput,
): ToggleInspectionPinAction {
  if (!input.hasInspection || !input.hasSeed) return { type: "ignore" };
  if (input.currentState === "pinned" && input.hasPendingPinned) return { type: "restore-pending" };
  return input.currentState === "pinned"
    ? { type: "flip-to-transient" }
    : { type: "flip-to-pinned" };
}

/**
 * Coordinator completeness for resolveInspection.
 * Uses `!== undefined` (not truthiness): defined falsy content is complete.
 */
export function resolveInspectionCompleteness(input: {
  readonly state: "transient" | "pinned";
  readonly hasCustomContent: boolean;
  readonly hasInspectCallback: boolean;
  readonly hasInteractionCallback: boolean;
}): "complete" | "transient" {
  if (
    input.state === "pinned" ||
    input.hasCustomContent ||
    input.hasInspectCallback ||
    input.hasInteractionCallback
  )
    return "complete";
  return "transient";
}

/**
 * Resolve effective inspect mode from optional concrete mode + config request.
 * Host: `concreteMode ?? (requested === "auto" ? seed.autoMode : requested)`.
 */
export function resolveInspectionMode(input: {
  readonly concreteMode: "exact" | "x" | "y" | "xy" | undefined;
  readonly requested: "auto" | "exact" | "x" | "y" | "xy";
  readonly seedAutoMode: "exact" | "x" | "y" | "xy";
}): "exact" | "x" | "y" | "xy" {
  if (input.concreteMode !== undefined) return input.concreteMode;
  if (input.requested === "auto") return input.seedAutoMode;
  return input.requested;
}

// ---- surface blur / outside pointer dismiss ----

export type SurfaceBlurAction =
  | { readonly type: "ignore" }
  | { readonly type: "blur-keep-pinned" }
  | { readonly type: "blur-clear-inspection" };

/**
 * Pure decision for capture-surface `blur`.
 *
 * Host on non-ignore (ordering is load-bearing):
 *   1. activeTraversalIndex = -1
 *   2. reducer.dispatch set-active null
 *   3. only blur-clear-inspection → setInspection(null, "keyboard")
 *
 * Host must pass `relatedTargetInsideRoot: root?.contains(related) === true`.
 * `"none"` and `"transient"` both clear inspection; `"pinned"` keeps it.
 */
export function resolveSurfaceBlurAction(input: {
  readonly relatedTargetInsideRoot: boolean;
  /** Host: `inspection === null ? "none" : inspection.state`. */
  readonly inspectionState: InspectionHostState;
}): SurfaceBlurAction {
  if (input.relatedTargetInsideRoot) return { type: "ignore" };
  if (input.inspectionState === "pinned") return { type: "blur-keep-pinned" };
  return { type: "blur-clear-inspection" };
}

/**
 * Whether a window pointerdown outside the plot should close a pinned
 * inspection. Host: only when `surfaceInteractive` effect is installed.
 * Host must pass `targetInsideRoot: root?.contains(target) === true`.
 */
export function shouldClosePinnedOnOutsidePointer(input: {
  readonly isPinned: boolean;
  readonly targetInsideRoot: boolean;
}): boolean {
  return input.isPinned && !input.targetInsideRoot;
}

// ---- inspection emission fingerprint gate ----

export type InspectionEmitAction =
  | { readonly type: "skip" }
  | {
      readonly type: "emit";
      /**
       * When non-null, host assigns `lastInspectionFingerprint = updateFingerprint`
       * before callbacks. When null, host must not mutate the last fingerprint
       * (undefined fingerprint path — always emit without update).
       */
      readonly updateFingerprint: string | null;
    };

/**
 * Pure gate for host `emitInspection` after the fingerprint has been resolved
 * (`clear:*` for clear phase via `clearInspectionFingerprint`, else the
 * coordinator's semantic fingerprint).
 *
 *   undefined fingerprint → emit, do not update last
 *   fingerprint === last  → skip (includes equal empty string; host inits last to "")
 *   otherwise             → emit and update last to fingerprint
 *
 * Host still owns fingerprint production (clear token vs semantic).
 */
export function resolveInspectionEmitAction(input: {
  readonly fingerprint: string | undefined;
  readonly lastFingerprint: string;
}): InspectionEmitAction {
  if (input.fingerprint === undefined) return { type: "emit", updateFingerprint: null };
  if (input.fingerprint === input.lastFingerprint) return { type: "skip" };
  return { type: "emit", updateFingerprint: input.fingerprint };
}
