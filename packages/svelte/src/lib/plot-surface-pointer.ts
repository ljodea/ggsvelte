import { isAreaTool, type InteractionTool } from "./interaction.js";
import type { PlotRect } from "./plot-geometry.js";

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
  | {
      readonly type: "begin-area";
      readonly extendExisting: boolean;
      /** Emit select-area start event (not zoom; not second-corner await). */
      readonly emitSelectStart: boolean;
      /** Interaction source for setInspection clear + select-start emission. */
      readonly source: "touch" | "pointer";
    }
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
  if (!isAreaTool(activeTool)) return { type: "none" };

  return {
    type: "begin-area",
    extendExisting: areaAwaitingSecond && hasBrushDraft,
    emitSelectStart: activeTool === "select-area" && !areaAwaitingSecond,
    source: interactionSourceFromPointerType(pointerType),
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
  | {
      readonly type: "touch-inspect-tap";
      /** Inspection state for setInspection (from pinEnabled). */
      readonly state: "pinned" | "transient";
    }
  | { readonly type: "touch-inspect-drag-ignore" }
  | {
      readonly type: "finish-brush";
      /** Interaction source for selection/zoom emission. */
      readonly source: "touch" | "pointer";
    }
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
    return {
      type: "touch-inspect-tap",
      state: pinEnabled ? "pinned" : "transient",
    };
  }

  if (!brushing || !hasBrushDraft) return { type: "none" };
  return {
    type: "finish-brush",
    source: interactionSourceFromPointerType(pointerType),
  };
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
 * Suppress synthetic click after a successful touch-inspect tap (ms).
 * Host: `suppressClickUntil = performance.now() + TOUCH_INSPECT_CLICK_SUPPRESS_MS`.
 */
export const TOUCH_INSPECT_CLICK_SUPPRESS_MS = 500;

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

/** Map a PointerEvent.pointerType string to InteractionSource surface values. */
export function interactionSourceFromPointerType(pointerType: string): "touch" | "pointer" {
  return pointerType === "touch" ? "touch" : "pointer";
}

const pointerSource = (pointerType: string): "touch" | "pointer" =>
  interactionSourceFromPointerType(pointerType);

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

/**
 * Matches `PointerBrushEnd` from plot-area-brush without importing that module
 * (local mirror; plot-area-brush does not import this file — no cycle risk,
 * but keep the payload shape self-contained for the pure pointer table).
 */
export type FinishBrushEnded =
  | { readonly kind: "too-small"; readonly corners: PlotRect }
  | { readonly kind: "commit"; readonly rect: PlotRect };

export type FinishBrushAction =
  | { readonly type: "keep-second-corner"; readonly corners: PlotRect }
  | { readonly type: "select-end"; readonly rect: PlotRect }
  | { readonly type: "zoom-end"; readonly rect: PlotRect }
  | { readonly type: "end-area" };

/**
 * Pure routing after `evaluatePointerBrushEnd` for pointerup finish-brush.
 *
 * Takes the full ended discriminant so actions carry rect/corners payloads —
 * host must not re-narrow `ended.kind` for emit/apply.
 *
 * Priority:
 *   1. keep-second-corner — too-small (wins for any tool); carries corners
 *   2. select-end — commit + select-area; carries rect
 *   3. zoom-end — commit + zoom-area; carries rect
 *   4. end-area — commit + any other tool (clear draft + cancel-area, no emit)
 *
 * Host on keep-second-corner: brushRect = action.corners, announce, no cancel-area.
 * Host on select-end/zoom-end/end-area: brushRect=null, cancel-area; emit/apply
 * using action.rect when present. Host keeps `brushRect === null` defensive break.
 */
export function resolveFinishBrushAction(input: {
  readonly ended: FinishBrushEnded;
  readonly activeTool: InteractionTool;
}): FinishBrushAction {
  if (input.ended.kind === "too-small") {
    return { type: "keep-second-corner", corners: input.ended.corners };
  }
  if (input.activeTool === "select-area") {
    return { type: "select-end", rect: input.ended.rect };
  }
  if (input.activeTool === "zoom-area") {
    return { type: "zoom-end", rect: input.ended.rect };
  }
  return { type: "end-area" };
}

// ---- lost pointer capture ----

/** Reducer area.kind values that the host may observe on lostpointercapture. */
export type AreaKind = "idle" | "first-corner" | "dragging";

/** True while an area brush session is active (not idle). */
export function isAreaBrushing(areaKind: AreaKind): boolean {
  return areaKind !== "idle";
}

/** True while waiting for the second brush corner (keyboard / too-small path). */
export function isAreaAwaitingSecond(areaKind: AreaKind): boolean {
  return areaKind === "first-corner";
}

export type LostPointerCaptureAction =
  | { readonly type: "ignore" }
  | { readonly type: "cancel-keep-draft" }
  | { readonly type: "cancel-clear-draft" };

/**
 * Pure routing for capture-surface `lostpointercapture`.
 *
 * Takes reducer `area.kind` (not derived booleans) so illegal combos like
 * `!brushing && areaAwaitingSecond` are unrepresentable.
 *
 *   idle         → ignore (no cancel-area)
 *   first-corner → cancel-keep-draft (dispatch cancel-area; retain brushRect)
 *   dragging     → cancel-clear-draft (clear brushRect + dispatch cancel-area)
 */
export function resolveLostPointerCaptureAction(areaKind: AreaKind): LostPointerCaptureAction {
  if (areaKind === "idle") return { type: "ignore" };
  if (areaKind === "first-corner") return { type: "cancel-keep-draft" };
  return { type: "cancel-clear-draft" };
}
