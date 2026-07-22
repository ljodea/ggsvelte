/**
 * Pure decision tables for capture-surface inspection *teardown* policy:
 * blur/outside dismiss, scene-run reconcile, emit fingerprint, escape/close plan.
 * Callers own reducer dispatch, field clears, coordinator, and focus.
 */

import type { InteractionSource } from "../interaction/interaction.js";
import { clearInspectionFingerprint } from "./coordinator.js";
import type { InspectionHostState } from "./frame.js";

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
 *
 * Takes domain `inspectionState` (not a pre-derived `isPinned` boolean) so
 * hosts pass `inspection?.state` directly — same shape as `isTooltipDocked`.
 */
export function shouldClosePinnedOnOutsidePointer(input: {
  readonly inspectionState: "transient" | "pinned" | "none" | null | undefined;
  readonly targetInsideRoot: boolean;
}): boolean {
  return input.inspectionState === "pinned" && !input.targetInsideRoot;
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
 *
 * `getInspectionState` is a thunk so the host `$effect` can avoid reading
 * hover `inspection` state on the skip path (same runId) — otherwise every
 * transient pointer update would re-run this effect only to hit skip.
 */
export function planSceneInspectReconcile(input: {
  readonly inspectionEnabled: boolean;
  /** Host: `() => (inspection === null ? "none" : inspection.state)`. */
  readonly getInspectionState: () => InspectionHostState;
  readonly modelRunId: number | null;
  readonly reconciledRun: number;
}): SceneInspectReconcilePlan {
  if (!input.inspectionEnabled) {
    return input.getInspectionState() === "none" ? { type: "noop" } : { type: "clear-disabled" };
  }
  if (input.modelRunId === null || input.modelRunId === input.reconciledRun) {
    return { type: "skip" };
  }
  const inspectionState = input.getInspectionState();
  if (inspectionState === "transient") {
    return { type: "invalidate-clear-transient" };
  }
  if (inspectionState === "pinned") {
    return { type: "invalidate-reconcile-pinned" };
  }
  return { type: "invalidate-idle" };
}

// ---- inspection emission fingerprint gate ----

export type InspectionEmitAction =
  | { readonly type: "skip" }
  | {
      readonly type: "emit";
      /**
       * When non-null, host assigns `lastInspectionFingerprint = updateFingerprint`
       * before callbacks. When null, host must not mutate the last fingerprint
       * (undefined semantic path on change — always emit without update).
       */
      readonly updateFingerprint: string | null;
    };

/**
 * Pure gate for host `emitInspection`: resolve fingerprint then skip/emit.
 *
 * Fingerprint production:
 *   clear  → `clearInspectionFingerprint(source)` (`clear:${source}`)
 *   change → `semanticFingerprint` (coordinator token; may be undefined)
 *
 * `semanticFingerprint` is meaningful only when `phase === "change"`.
 *
 * Emit rules after fingerprint is resolved:
 *   undefined fingerprint → emit, do not update last
 *   fingerprint === last  → skip (includes equal empty string; host inits last to "")
 *   otherwise             → emit and update last to fingerprint
 */
export function resolveInspectionEmitAction(input: {
  readonly phase: "clear" | "change";
  readonly source: InteractionSource;
  /** Coordinator semantic fingerprint; ignored when phase is clear. */
  readonly semanticFingerprint: string | undefined;
  readonly lastFingerprint: string;
}): InspectionEmitAction {
  const fingerprint =
    input.phase === "clear" ? clearInspectionFingerprint(input.source) : input.semanticFingerprint;
  if (fingerprint === undefined) return { type: "emit", updateFingerprint: null };
  if (fingerprint === input.lastFingerprint) return { type: "skip" };
  return { type: "emit", updateFingerprint: fingerprint };
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
