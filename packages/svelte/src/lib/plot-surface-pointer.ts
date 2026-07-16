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
