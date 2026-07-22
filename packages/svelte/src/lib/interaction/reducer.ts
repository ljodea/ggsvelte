import type { InteractionSource, InteractionTool } from "./interaction.js";

/** Candidate identity carried on inspect pointer-frame payloads (not reducer state). */
export interface InteractionCandidateRef {
  readonly epoch: number;
  readonly id: number;
  readonly panelId: string | null;
  readonly x: number;
  readonly y: number;
}

type AreaState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "first-corner" | "dragging";
      tool: "select-area" | "zoom-area";
      panelId: string | null;
      start: Readonly<{ x: number; y: number }>;
      current: Readonly<{ x: number; y: number }>;
    }>;

/**
 * Reducer owns tool + area brush + frame epoch/revision.
 * Inspection lifecycle lives solely in InspectionState (single authority).
 */
export interface InteractionReducerState {
  readonly revision: number;
  readonly epoch: number;
  readonly tool: InteractionTool;
  readonly area: AreaState;
}

/**
 * Actions. `inspect` is a **pointer-frame payload only** — delivered to
 * `onPointerFrame` and never stored on reducer state.
 */
export type InteractionAction =
  | { type: "inspect"; candidate: InteractionCandidateRef | null; source: InteractionSource }
  | { type: "escape"; source: InteractionSource }
  | { type: "set-tool"; tool: InteractionTool }
  | { type: "begin-area"; point: Readonly<{ x: number; y: number }>; panelId: string | null }
  | { type: "move-area"; point: Readonly<{ x: number; y: number }> }
  | { type: "cancel-area" }
  | { type: "invalidate"; reason: "resize" | "data" | "scene" | "dispose" };

export interface InteractionFrameToken {
  readonly epoch: number;
  readonly revision: number;
}

export type PointerScheduleKind = "inspect" | "move-area";

export function createInteractionReducer(
  options: {
    initialTool?: InteractionTool;
    onChange?: (state: InteractionReducerState) => void;
    /**
     * Continuous pointer-frame sink.
     * - inspect: InspectionState only (never reducer-dispatched)
     * - move-area: may return false to skip dispatch (unused today)
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
    area: { kind: "idle" },
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
    // Discrete boundaries always win over queued pointer coordinates.
    if (
      action.type === "escape" ||
      action.type === "set-tool" ||
      action.type === "cancel-area" ||
      action.type === "invalidate"
    )
      cancelScheduledPointer();
    switch (action.type) {
      case "inspect":
        // Inspect payloads are frame-only; never mutate reducer state.
        return;
      case "escape":
        // Area cancel + epoch only. Inspection dismiss is InspectionState-owned.
        if (state.area.kind === "idle") {
          commit({ epoch: state.epoch + 1 });
        } else {
          commit({ area: { kind: "idle" }, epoch: state.epoch + 1 });
        }
        return;
      case "set-tool":
        if (state.tool !== action.tool || state.area.kind !== "idle") {
          commit({ tool: action.tool, area: { kind: "idle" }, epoch: state.epoch + 1 });
        }
        return;
      case "begin-area":
        if (state.tool !== "select-area" && state.tool !== "zoom-area") return;
        commit({
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
        if (latest === null) return;
        // Inspect frames are owned by InspectionState — never reducer-dispatched.
        if (latest.type === "inspect") {
          options.onPointerFrame?.(latest);
          return;
        }
        const shouldDispatch = options.onPointerFrame?.(latest);
        if (shouldDispatch !== false) dispatch(latest);
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
