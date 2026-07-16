/**
 * Pure decision tables for capture-surface inspection host policy.
 * Callers own queue mutation, setInspection, and reducer side effects.
 */

export type InspectionHostState = "none" | "transient" | "pinned";

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
