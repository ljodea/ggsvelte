import type { InteractionSource, InteractionTool } from "./interaction.js";

export interface InteractionCandidateRef {
  readonly epoch: number;
  readonly id: number;
  readonly panelId: string | null;
  readonly x: number;
  readonly y: number;
}

export type InspectionState = Readonly<{
  kind: "idle" | "transient" | "pinned" | "dismissed";
  candidate: InteractionCandidateRef | null;
  source: InteractionSource;
}>;

type AreaState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "first-corner" | "dragging";
      tool: "select-area" | "zoom-area";
      panelId: string | null;
      start: Readonly<{ x: number; y: number }>;
      current: Readonly<{ x: number; y: number }>;
    }>;

export interface InteractionReducerState {
  readonly revision: number;
  readonly epoch: number;
  readonly tool: InteractionTool;
  readonly inspection: InspectionState;
  readonly area: AreaState;
  readonly activeCandidate: InteractionCandidateRef | null;
}

export type InteractionAction =
  | { type: "inspect"; candidate: InteractionCandidateRef | null; source: InteractionSource }
  | { type: "toggle-pin"; source: InteractionSource }
  | { type: "escape"; source: InteractionSource }
  | { type: "set-tool"; tool: InteractionTool }
  | { type: "begin-area"; point: Readonly<{ x: number; y: number }>; panelId: string | null }
  | { type: "move-area"; point: Readonly<{ x: number; y: number }> }
  | { type: "cancel-area" }
  | { type: "set-active"; candidate: InteractionCandidateRef | null }
  | { type: "invalidate"; reason: "resize" | "data" | "scene" | "dispose" };

export interface InteractionFrameToken {
  readonly epoch: number;
  readonly revision: number;
}

const idleInspection = (source: InteractionSource = "programmatic"): InspectionState => ({
  kind: "idle",
  candidate: null,
  source,
});

function sameCandidate(
  a: InteractionCandidateRef | null,
  b: InteractionCandidateRef | null,
): boolean {
  return a === b || (a !== null && b !== null && a.epoch === b.epoch && a.id === b.id);
}

export type PointerScheduleKind = "inspect" | "move-area";

export function createInteractionReducer(
  options: {
    initialTool?: InteractionTool;
    onChange?: (state: InteractionReducerState) => void;
    /**
     * Continuous pointer-frame sink. Return `false` to skip the subsequent
     * `dispatch` (atomic drop for stale inspect frames). Void/`true` dispatches.
     */
    onPointerFrame?: (
      action: Extract<InteractionAction, { type: "inspect" | "move-area" }>,
    ) => boolean | void;
    scheduleFrame?: (callback: () => void) => unknown;
    cancelFrame?: (handle: unknown) => void;
  } = {},
) {
  let state: InteractionReducerState = {
    revision: 0,
    epoch: 0,
    tool: options.initialTool ?? "inspect",
    inspection: idleInspection(),
    area: { kind: "idle" },
    activeCandidate: null,
  };
  let scheduledPointerAction: Extract<InteractionAction, { type: "inspect" | "move-area" }> | null =
    null;
  let frameHandle: unknown = null;

  /**
   * Cancel the coalesced pointer schedule. With `kind`, cancel only when the
   * queued action matches (inspect cancel must not kill move-area).
   */
  const cancelScheduledPointer = (kind?: PointerScheduleKind): void => {
    if (
      kind !== undefined &&
      (scheduledPointerAction === null || scheduledPointerAction.type !== kind)
    )
      return;
    if (frameHandle !== null) options.cancelFrame?.(frameHandle);
    frameHandle = null;
    scheduledPointerAction = null;
  };

  const commit = (patch: Partial<InteractionReducerState>): void => {
    state = Object.freeze({ ...state, ...patch, revision: state.revision + 1 });
    options.onChange?.(state);
  };

  const dispatch = (action: InteractionAction): void => {
    // Discrete boundaries always win over queued pointer coordinates. This
    // keeps cancel/keyboard/tool changes synchronous with the visible state.
    if (
      action.type === "escape" ||
      action.type === "set-tool" ||
      action.type === "cancel-area" ||
      action.type === "invalidate" ||
      ("source" in action && action.source !== "pointer" && action.source !== "touch")
    )
      cancelScheduledPointer();
    switch (action.type) {
      case "inspect": {
        if (state.inspection.kind === "pinned") return;
        if (action.candidate === null) {
          if (state.inspection.kind === "idle") return;
          commit({ inspection: idleInspection(action.source) });
          return;
        }
        if (
          state.inspection.kind === "dismissed" &&
          sameCandidate(state.inspection.candidate, action.candidate)
        )
          return;
        if (
          state.inspection.kind === "transient" &&
          sameCandidate(state.inspection.candidate, action.candidate)
        )
          return;
        commit({
          activeCandidate: action.candidate,
          inspection: { kind: "transient", candidate: action.candidate, source: action.source },
        });
        return;
      }
      case "toggle-pin": {
        const current = state.inspection;
        if (current.kind === "pinned") {
          commit({ inspection: idleInspection(action.source) });
        } else if (current.candidate !== null) {
          commit({
            inspection: { kind: "pinned", candidate: current.candidate, source: action.source },
          });
        }
        return;
      }
      case "escape": {
        if (state.area.kind !== "idle") {
          commit({ area: { kind: "idle" }, epoch: state.epoch + 1 });
        } else if (state.inspection.kind === "pinned") {
          commit({ inspection: idleInspection(action.source), epoch: state.epoch + 1 });
        } else if (state.inspection.candidate === null) {
          commit({ epoch: state.epoch + 1 });
        } else {
          commit({
            inspection: {
              kind: "dismissed",
              candidate: state.inspection.candidate,
              source: action.source,
            },
            epoch: state.epoch + 1,
          });
        }
        return;
      }
      case "set-tool":
        if (state.tool !== action.tool || state.area.kind !== "idle") {
          commit({ tool: action.tool, area: { kind: "idle" }, epoch: state.epoch + 1 });
        }
        return;
      case "begin-area":
        if (state.tool !== "select-area" && state.tool !== "zoom-area") return;
        commit({
          inspection: idleInspection(),
          area: {
            kind: "first-corner",
            tool: state.tool,
            panelId: action.panelId,
            start: action.point,
            current: action.point,
          },
        });
        return;
      case "move-area":
        if (state.area.kind === "idle") return;
        commit({ area: { ...state.area, kind: "dragging", current: action.point } });
        return;
      case "cancel-area":
        if (state.area.kind !== "idle") commit({ area: { kind: "idle" }, epoch: state.epoch + 1 });
        return;
      case "set-active":
        if (!sameCandidate(state.activeCandidate, action.candidate))
          commit({ activeCandidate: action.candidate });
        return;
      case "invalidate":
        commit({ area: { kind: "idle" }, epoch: state.epoch + 1 });
    }
  };

  return {
    get state(): InteractionReducerState {
      return state;
    },
    dispatch,
    /** Coalesce continuous pointer coordinates to the latest action per frame. */
    queuePointer(action: Extract<InteractionAction, { type: "inspect" | "move-area" }>): void {
      scheduledPointerAction = action;
      if (frameHandle !== null) return;
      const schedule =
        options.scheduleFrame ??
        ((callback: () => void) => {
          queueMicrotask(callback);
          return 1;
        });
      frameHandle = schedule(() => {
        frameHandle = null;
        const latest = scheduledPointerAction;
        scheduledPointerAction = null;
        if (latest !== null) {
          // false = atomic drop (e.g. stale inspect token): skip dispatch so
          // reducer inspection does not diverge from InspectionState.
          const shouldDispatch = options.onPointerFrame?.(latest);
          if (shouldDispatch !== false) dispatch(latest);
        }
      });
    },
    cancelScheduledPointer,
    frameToken(): InteractionFrameToken {
      return { epoch: state.epoch, revision: state.revision };
    },
    accepts(token: InteractionFrameToken): boolean {
      return token.epoch === state.epoch && token.revision === state.revision;
    },
  };
}
