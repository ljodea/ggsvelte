/**
 * Pure decision tables for capture-surface inspection *apply* policy:
 * setInspection gates, pin toggle, mode/completeness resolution.
 * Callers own resolve, reducer, emit, and DOM side effects.
 */

import type { InteractionSource } from "../interaction/interaction.js";
import type { InspectionHostState, QueuedPointerInspection } from "./frame.js";

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

export type ToggleInspectionPinInput = {
  readonly hasInspection: boolean;
  readonly hasSeed: boolean;
  /** Host: current inspection.state when hasInspection. */
  readonly currentState: "transient" | "pinned";
  /** Host: `pendingPinnedPointer` (null when none). */
  readonly pending: QueuedPointerInspection | null;
};

export type ToggleInspectionPinAction =
  | { readonly type: "ignore" }
  | {
      readonly type: "restore-pending";
      /** Pending queue payload to restore as transient inspection. */
      readonly pending: QueuedPointerInspection;
    }
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
 *   3. restore-pending → release pinned, clear fields, setInspection(action.pending…, "transient")
 *   4. flip → resolveInspection with action.state; if null return with reducer
 *      already toggled (host does not roll back reducer state)
 *
 * `pending` replaces a separate `hasPendingPinned` boolean so restore cannot
 * race a null payload and the host does not non-null-assert after the gate.
 */
export function resolveToggleInspectionPinAction(
  input: ToggleInspectionPinInput,
): ToggleInspectionPinAction {
  if (!input.hasInspection || !input.hasSeed) return { type: "ignore" };
  if (input.currentState === "pinned" && input.pending !== null)
    return { type: "restore-pending", pending: input.pending };
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
