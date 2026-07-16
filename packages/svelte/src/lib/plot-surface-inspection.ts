/**
 * Pure decision tables for capture-surface inspection host policy.
 * Callers own queue mutation, setInspection, and reducer side effects.
 */

import type { CandidateFacts, CandidateMatch } from "@ggsvelte/core";
import type { SceneHit } from "@ggsvelte/core/dom";

import type { InteractionSource } from "./interaction.js";
import { hitFromCandidate } from "./plot-pointer.js";

type InspectionHostState = "none" | "transient" | "pinned";

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
 * `fallbackHit` and `panelIdForIndex` are thunks evaluated only on the path
 * that needs them.
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
  readonly fallbackHit: () => SceneHit | null;
  /** Evaluated only when match is non-null. */
  readonly panelIdForIndex: (panelIndex: number) => string | null;
}): QueuedInspectFrameBuild {
  if (input.match === null) {
    const hit = input.fallbackHit();
    return {
      queued: buildQueuedPointerInspection({
        hit,
        source: input.source,
        match: null,
      }),
      candidate: null,
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
  | {
      readonly type: "clear";
      /**
       * Host should emit inspect clear. True when currentState !== "none"
       * (after clear-gate priority, this is effectively currentState === "transient").
       */
      readonly emitClear: boolean;
    }
  | { readonly type: "apply" };

/**
 * Pure decision for the start of host `setInspection`.
 *
 * Priority (matches current host):
 *   1. ignore — current pinned + requested transient
 *   2. ignore — !hasHit && (tooltipHovered || current pinned)
 *   3. clear — !hasHit (emitClear when currentState !== "none")
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
    return { type: "clear", emitClear: input.currentState !== "none" };
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
  | {
      readonly type: "flip";
      /** Target inspection state after toggle-pin dispatch + re-resolve. */
      readonly state: "transient" | "pinned";
    };

/**
 * Pure decision for host `toggleInspectionPin` after the null-seed guard.
 *
 * Host sequencing (preserve exactly):
 *   1. if ignore → return (no reducer dispatch)
 *   2. always `reducer.dispatch({ type: "toggle-pin", source })` first
 *   3. restore-pending → release pinned, clear fields, setInspection(pending…)
 *   4. flip → resolveInspection with action.state; if null return with reducer
 *      already toggled (host does not roll back reducer state)
 */
export function resolveToggleInspectionPinAction(
  input: ToggleInspectionPinInput,
): ToggleInspectionPinAction {
  if (!input.hasInspection || !input.hasSeed) return { type: "ignore" };
  if (input.currentState === "pinned" && input.hasPendingPinned) return { type: "restore-pending" };
  return {
    type: "flip",
    state: input.currentState === "pinned" ? "transient" : "pinned",
  };
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

// ---- scene-run inspection reconcile (host $effect) ----

export type SceneInspectReconcilePlan =
  | { readonly type: "noop" }
  | { readonly type: "clear-disabled" }
  | { readonly type: "skip" }
  | { readonly type: "invalidate-clear-transient" }
  | { readonly type: "invalidate-idle" }
  | { readonly type: "invalidate-reconcile-pinned" };

/**
 * Priority table for the model-run inspection reconcile effect.
 *
 *   1. inspect off → clear-disabled when live inspection exists, else noop
 *   2. no model / same runId as reconciledRun → skip
 *   3. run advanced + transient → invalidate-clear-transient
 *   4. run advanced + pinned → invalidate-reconcile-pinned
 *   5. run advanced + none → invalidate-idle
 *
 * Host on every invalidate-*: clear queues, cancel scheduled pointer, set
 * reconciledRun to the new model runId, then branch-specific side effects.
 */
export function planSceneInspectReconcile(input: {
  readonly inspectionEnabled: boolean;
  /** Host: `inspection === null ? "none" : inspection.state`. */
  readonly inspectionState: InspectionHostState;
  readonly modelRunId: number | null;
  readonly reconciledRun: number;
}): SceneInspectReconcilePlan {
  if (!input.inspectionEnabled) {
    return input.inspectionState === "none" ? { type: "noop" } : { type: "clear-disabled" };
  }
  if (input.modelRunId === null || input.modelRunId === input.reconciledRun) {
    return { type: "skip" };
  }
  if (input.inspectionState === "transient") {
    return { type: "invalidate-clear-transient" };
  }
  if (input.inspectionState === "pinned") {
    return { type: "invalidate-reconcile-pinned" };
  }
  return { type: "invalidate-idle" };
}

// ---- toggle-pin chrome gates ----

/**
 * Whether unpinning should announce for a11y (keyboard/touch only).
 * Host: only after a successful flip-to-transient resolve.
 */
export function shouldAnnounceUnpin(input: {
  readonly state: "transient" | "pinned";
  readonly source: InteractionSource;
}): boolean {
  return input.state === "transient" && (input.source === "keyboard" || input.source === "touch");
}

/**
 * Whether to move focus into the interactive pinned tooltip after pin.
 * Host still runs the querySelector focus in a microtask.
 */
export function shouldFocusPinnedInteractiveTooltip(input: {
  readonly state: "transient" | "pinned";
  readonly contentMode: "interactive" | "informational" | undefined;
}): boolean {
  return input.state === "pinned" && input.contentMode === "interactive";
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

// ---- inspection dismiss (escape vs close) ----

export type InspectionDismissKind = "escape" | "close";

/**
 * Host side-effect plan for dismissing inspection.
 * Used by a single host `dismissInspection` that Escape and closeInspection share.
 *
 * Escape (keyboard): invalidate coordinator, clear brush, optional returnToInspect;
 * does **not** clear pendingPinnedPointer (preserved host behavior — may be
 * intentional for pin-restore after tool reset).
 * Close: release pinned, clear pending, optional restore focus to capture surface.
 */
export type InspectionDismissPlan = {
  readonly emitClear: boolean;
  readonly clearPendingPinned: boolean;
  readonly coordinator: "invalidate" | "release-pinned";
  readonly clearBrush: boolean;
  readonly clearTooltipHovered: boolean;
  readonly restoreFocus: boolean;
  readonly returnToInspect: boolean;
};

/**
 * Pure plan for unified inspection dismiss.
 * Host always dispatches reducer `{ type: "escape", source }` first, then applies
 * this plan for field clears / coordinator / focus / tool.
 */
export function planInspectionDismiss(input: {
  readonly kind: InspectionDismissKind;
  readonly hasInspection: boolean;
  /** Close only; defaults to true when omitted (matches closeInspection default). */
  readonly restoreFocus?: boolean;
  /** Escape only; from `resolveSurfaceKeyAction` escape.returnToInspect. */
  readonly returnToInspect?: boolean;
}): InspectionDismissPlan {
  if (input.kind === "escape") {
    return {
      emitClear: input.hasInspection,
      clearPendingPinned: false,
      coordinator: "invalidate",
      clearBrush: true,
      clearTooltipHovered: true,
      restoreFocus: false,
      returnToInspect: input.returnToInspect === true,
    };
  }
  return {
    emitClear: input.hasInspection,
    clearPendingPinned: true,
    coordinator: "release-pinned",
    clearBrush: false,
    clearTooltipHovered: true,
    restoreFocus: input.restoreFocus !== false,
    returnToInspect: false,
  };
}
