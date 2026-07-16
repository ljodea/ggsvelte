import type { InteractionTool } from "./interaction.js";

/**
 * Capture-surface pointer decision input for pointerdown.
 * `hasBrushDraft` mirrors `brushRect !== null` and can diverge from
 * reducer `areaAwaitingSecond` (same draft/reducer split as keyboard).
 */
export type SurfacePointerDownInput = {
  readonly pointerType: string;
  readonly button: number;
  readonly activeTool: InteractionTool;
  /** Reducer "awaiting second corner" flag. */
  readonly areaAwaitingSecond: boolean;
  /** True when a brush draft corner exists (`brushRect !== null`). */
  readonly hasBrushDraft: boolean;
};

export type SurfacePointerDownAction =
  | { readonly type: "touch-inspect-start" }
  | { readonly type: "begin-area"; readonly extendExisting: boolean }
  | { readonly type: "none" };

/**
 * Pure decision for the plot capture-surface `pointerdown` handler.
 * Priority: touch-inspect start (before button/tool checks) → primary-button
 * area begin/extend → none. Callers own queued-inspection cancel, draft
 * mutation, reducer dispatch, selection start emission, and capture.
 */
export function resolvePointerDownAction(input: SurfacePointerDownInput): SurfacePointerDownAction {
  const { pointerType, button, activeTool, areaAwaitingSecond, hasBrushDraft } = input;

  if (activeTool === "inspect" && pointerType === "touch") return { type: "touch-inspect-start" };

  if (button !== 0) return { type: "none" };
  if (activeTool !== "select-area" && activeTool !== "zoom-area") return { type: "none" };

  return {
    type: "begin-area",
    extendExisting: areaAwaitingSecond && hasBrushDraft,
  };
}

/**
 * Capture-surface pointerup decision input.
 * Touch-inspect fields only matter when tool is inspect + pointer is touch.
 */
export type SurfacePointerUpInput = {
  readonly pointerType: string;
  readonly activeTool: InteractionTool;
  readonly inspectEnabled: boolean;
  readonly pinEnabled: boolean;
  readonly hasTouchInspectStart: boolean;
  readonly touchInspectMoved: boolean;
  /** Reducer brushing flag — can diverge from draft. */
  readonly brushing: boolean;
  /** True when `brushRect !== null`. */
  readonly hasBrushDraft: boolean;
};

export type SurfacePointerUpAction =
  | { readonly type: "touch-inspect-tap"; readonly pin: boolean }
  | { readonly type: "touch-inspect-drag-ignore" }
  | { readonly type: "finish-brush" }
  | { readonly type: "none" };

/**
 * Pure decision for the plot capture-surface `pointerup` handler.
 * Priority: touch-inspect tap/drag → finish-brush (both brushing and draft)
 * → none. Geometry (too-small) and emission stay with the host after
 * `finish-brush`. Host always clears touch-inspect start state for both
 * touch-inspect actions.
 */
export function resolvePointerUpAction(input: SurfacePointerUpInput): SurfacePointerUpAction {
  const {
    pointerType,
    activeTool,
    inspectEnabled,
    pinEnabled,
    hasTouchInspectStart,
    touchInspectMoved,
    brushing,
    hasBrushDraft,
  } = input;

  if (
    activeTool === "inspect" &&
    pointerType === "touch" &&
    inspectEnabled &&
    hasTouchInspectStart
  ) {
    if (touchInspectMoved) return { type: "touch-inspect-drag-ignore" };
    return { type: "touch-inspect-tap", pin: pinEnabled };
  }

  if (!brushing || !hasBrushDraft) return { type: "none" };
  return { type: "finish-brush" };
}

export type SurfaceClickInput = {
  /** True when `performance.now() < suppressClickUntil`. */
  readonly suppressClick: boolean;
  readonly activeTool: InteractionTool;
  /** True when interval/point select is configured as point. */
  readonly pointSelectEnabled: boolean;
  readonly inspectEnabled: boolean;
  readonly pinEnabled: boolean;
  readonly hasInspection: boolean;
};

export type SurfaceClickAction =
  | { readonly type: "suppress" }
  | { readonly type: "toggle-point" }
  | { readonly type: "toggle-pin" }
  | { readonly type: "none" };

/**
 * Pure decision for the capture-surface click handler.
 * Priority: suppress → point toggle → inspect pin toggle → none.
 * Host clears the suppress timestamp when action is `suppress`.
 */
export function resolveCaptureClickAction(input: SurfaceClickInput): SurfaceClickAction {
  if (input.suppressClick) return { type: "suppress" };

  if (input.activeTool === "point" && input.pointSelectEnabled) return { type: "toggle-point" };

  if (
    input.activeTool === "inspect" &&
    input.inspectEnabled &&
    input.hasInspection &&
    input.pinEnabled
  )
    return { type: "toggle-pin" };

  return { type: "none" };
}

// ---- pointer move ----

/** Pixel threshold for sticky touch-inspect drag (plotPoint coordinates). */
export const TOUCH_INSPECT_MOVE_PX = 4;

/**
 * Sticky OR of touch-inspect drag past threshold in plotPoint coordinates.
 * Exactly `TOUCH_INSPECT_MOVE_PX` counts as moved (`>=`).
 * Host calls only when `pointerType === "touch" && touchInspectStart !== null`.
 */
export function advanceTouchInspectMoved(
  alreadyMoved: boolean,
  start: Readonly<{ x: number; y: number }>,
  point: Readonly<{ x: number; y: number }>,
): boolean {
  if (alreadyMoved) return true;
  return Math.hypot(point.x - start.x, point.y - start.y) >= TOUCH_INSPECT_MOVE_PX;
}

export type SurfacePointerMoveInput = {
  readonly pointerType: string;
  readonly activeTool: InteractionTool;
  /** Host sticky flag after `advanceTouchInspectMoved` (or false if no touch start). */
  readonly touchInspectMoved: boolean;
  /** True when `touchInspectStart !== null`. */
  readonly hasTouchInspectStart: boolean;
  /** Reducer brushing flag — can diverge from draft. */
  readonly brushing: boolean;
  /** True when `brushRect !== null`. */
  readonly hasBrushDraft: boolean;
  /** `interactionConfig.inspect !== null`. */
  readonly inspectEnabled: boolean;
};

export type SurfacePointerMoveAction =
  | { readonly type: "touch-inspect-drag-cancel" }
  | { readonly type: "queue-area-move"; readonly source: "touch" | "pointer" }
  | { readonly type: "queue-inspect"; readonly source: "touch" | "pointer" }
  | { readonly type: "none" };

const pointerSource = (pointerType: string): "touch" | "pointer" =>
  pointerType === "touch" ? "touch" : "pointer";

/**
 * Pure decision for the plot capture-surface `pointermove` handler.
 * Priority: touch-inspect drag cancel → queue area move → queue inspect → none.
 *
 * Cancel requires `pointerType === "touch"` (mouse/pen with residual start must
 * not cancel). Cancel does **not** require `inspectEnabled` — only the inspect
 * tool, matching the current host.
 *
 * Host advances `touchInspectMoved` separately on touch+start before calling.
 * Host on cancel: clear `queuedPointerInspection`, cancel scheduled pointer
 * (`queuedPointerToken` left untouched). Host on queue-*: use `action.source`.
 */
export function resolvePointerMoveAction(input: SurfacePointerMoveInput): SurfacePointerMoveAction {
  const {
    pointerType,
    activeTool,
    touchInspectMoved,
    hasTouchInspectStart,
    brushing,
    hasBrushDraft,
    inspectEnabled,
  } = input;

  if (
    pointerType === "touch" &&
    hasTouchInspectStart &&
    touchInspectMoved &&
    activeTool === "inspect"
  ) {
    return { type: "touch-inspect-drag-cancel" };
  }

  if (brushing && hasBrushDraft) {
    return { type: "queue-area-move", source: pointerSource(pointerType) };
  }

  if (activeTool === "inspect" && inspectEnabled) {
    return { type: "queue-inspect", source: pointerSource(pointerType) };
  }

  return { type: "none" };
}

// ---- pointer leave / finish-brush ----

/**
 * Whether pointerleave should clear inspection after its microtask flush.
 * Host must call this **inside** `queueMicrotask` so `brushing` and
 * `tooltipHovered` reflect post-flush state (not leave-time snapshots).
 */
export function shouldClearInspectionOnPointerLeave(input: {
  readonly brushing: boolean;
  readonly tooltipHovered: boolean;
}): boolean {
  return !input.brushing && !input.tooltipHovered;
}

/** Matches `PointerBrushEnd["kind"]` from plot-area-brush (no import cycle). */
export type FinishBrushEndedKind = "too-small" | "commit";

export type FinishBrushAction =
  | { readonly type: "keep-second-corner" }
  | { readonly type: "select-end" }
  | { readonly type: "zoom-end" }
  | { readonly type: "end-area" };

/**
 * Pure routing after `evaluatePointerBrushEnd` for pointerup finish-brush.
 *
 * Priority:
 *   1. keep-second-corner — `endedKind === "too-small"` (wins for any tool)
 *   2. select-end — commit + select-area
 *   3. zoom-end — commit + zoom-area
 *   4. end-area — commit + any other tool (clear draft + cancel-area, no emit)
 *
 * Host on keep-second-corner: retain corners, announce, do **not** cancel-area.
 * Host on select-end/zoom-end/end-area: brushRect=null, cancel-area; emit only
 * for select/zoom. Host keeps its `brushRect === null` defensive break.
 */
export function resolveFinishBrushAction(input: {
  readonly endedKind: FinishBrushEndedKind;
  readonly activeTool: InteractionTool;
}): FinishBrushAction {
  if (input.endedKind === "too-small") return { type: "keep-second-corner" };
  if (input.activeTool === "select-area") return { type: "select-end" };
  if (input.activeTool === "zoom-area") return { type: "zoom-end" };
  return { type: "end-area" };
}
