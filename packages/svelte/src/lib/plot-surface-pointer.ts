import { isAreaTool, type InteractionTool } from "./interaction.js";
import { initialBrushRect, type BrushCorners, type PlotPoint } from "./plot-area-brush.js";
import { resolvePointerFinishBrushAction, type FinishBrushAction } from "./plot-brush-finish.js";

/**
 * Capture-surface pointer decision input for pointerdown.
 *
 * `brushCorners` is the sole draft source of truth (host: `brushRect`).
 * Distinct from reducer `areaAwaitingSecond` — both must hold to extend.
 * `point` is the down-event plot point (host always computes it).
 */
export type SurfacePointerDownInput = {
  readonly pointerType: string;
  readonly button: number;
  readonly activeTool: InteractionTool;
  /** Reducer "awaiting second corner" flag. */
  readonly areaAwaitingSecond: boolean;
  /**
   * Host: `brushRect`. Non-null when a draft free corner exists.
   * Extend only when combined with `areaAwaitingSecond`.
   */
  readonly brushCorners: BrushCorners | null;
  /** Host: `plotPoint(event)` — always available on pointerdown. */
  readonly point: PlotPoint;
};

export type SurfacePointerDownAction =
  | { readonly type: "touch-inspect-start" }
  | {
      readonly type: "begin-area";
      /**
       * Pure-owned draft corners (fresh degenerate or extended free corner).
       * Host assigns `brushRect = action.corners` without re-deriving policy.
       */
      readonly corners: BrushCorners;
      /** Emit select-area start event (not zoom; not second-corner await). */
      readonly emitSelectStart: boolean;
      /** Interaction source for setInspection clear + select-start emission. */
      readonly source: "touch" | "pointer";
    }
  | { readonly type: "none" };

/**
 * Pure decision for the plot capture-surface `pointerdown` handler.
 * Priority: touch-inspect start (before button/tool checks) → primary-button
 * area begin/extend → none. Owns extend-vs-fresh corner policy via
 * `initialBrushRect`. Callers own queued-inspection cancel, draft mutation,
 * reducer dispatch, selection start emission, and capture.
 */
export function resolvePointerDownAction(input: SurfacePointerDownInput): SurfacePointerDownAction {
  const { pointerType, button, activeTool, areaAwaitingSecond, brushCorners, point } = input;

  if (activeTool === "inspect" && pointerType === "touch") return { type: "touch-inspect-start" };

  if (button !== 0) return { type: "none" };
  if (!isAreaTool(activeTool)) return { type: "none" };

  return {
    type: "begin-area",
    corners: initialBrushRect({
      areaAwaitingSecond,
      existing: brushCorners,
      point,
    }),
    emitSelectStart: activeTool === "select-area" && !areaAwaitingSecond,
    source: interactionSourceFromPointerType(pointerType),
  };
}

/**
 * Domain inspect snapshot for pointer move/up (host: resolved
 * `interactionConfig.inspect`). Pass the domain object, not a pre-derived
 * `inspectEnabled` boolean — matches inspection-state domain convention.
 */
type SurfaceInspectConfig = {
  readonly mode: "auto" | "exact" | "x" | "y" | "xy";
  readonly maxDistance: number;
  readonly pin: boolean;
} | null;

/**
 * Capture-surface pointerup decision input.
 * Touch-inspect fields only matter when tool is inspect + pointer is touch.
 *
 * `brushCorners` is the sole draft source of truth for finish-brush (host:
 * `brushRect`). Distinct from reducer `brushing`, which can diverge.
 * `endPoint` is always the up-event plot point (host always computes it).
 */
export type SurfacePointerUpInput = {
  readonly pointerType: string;
  readonly activeTool: InteractionTool;
  /** Host: resolved `interactionConfig.inspect`. */
  readonly inspect: SurfaceInspectConfig;
  readonly hasTouchInspectStart: boolean;
  readonly touchInspectMoved: boolean;
  /** Reducer brushing flag — can diverge from draft. */
  readonly brushing: boolean;
  /**
   * Host: `brushRect`. Non-null when a draft free corner exists.
   * Finish-brush requires both brushing and non-null corners.
   */
  readonly brushCorners: BrushCorners | null;
  /** Host: `plotPoint(event)` — always available on pointerup. */
  readonly endPoint: PlotPoint;
};

export type SurfacePointerUpAction =
  | {
      readonly type: "touch-inspect-tap";
      /** Inspection state for setInspection (from inspect.pin). */
      readonly state: "pinned" | "transient";
      /** Nearest-query params from inspect snapshot at decision time. */
      readonly mode: "auto" | "exact" | "x" | "y" | "xy";
      readonly maxDistance: number;
    }
  | { readonly type: "touch-inspect-drag-ignore" }
  | {
      readonly type: "finish-brush";
      /** Interaction source for selection/zoom emission. */
      readonly source: "touch" | "pointer";
      /**
       * Pure-owned too-small/commit + select/zoom/end routing (shared with
       * keyboard complete-area via plot-brush-finish).
       */
      readonly finish: FinishBrushAction;
    }
  | { readonly type: "none" };

/**
 * Pure decision for the plot capture-surface `pointerup` handler.
 * Priority: touch-inspect tap/drag → finish-brush (both brushing and draft)
 * → none. Finish-brush carries the complete finish payload (too-small vs
 * commit, select/zoom/end). Host cancels scheduled pointer then
 * `applyFinishBrush(action.finish, action.source)`. Host always clears
 * touch-inspect start state for both touch-inspect actions.
 */
export function resolvePointerUpAction(input: SurfacePointerUpInput): SurfacePointerUpAction {
  const {
    pointerType,
    activeTool,
    inspect,
    hasTouchInspectStart,
    touchInspectMoved,
    brushing,
    brushCorners,
    endPoint,
  } = input;

  if (
    activeTool === "inspect" &&
    pointerType === "touch" &&
    inspect !== null &&
    hasTouchInspectStart
  ) {
    if (touchInspectMoved) return { type: "touch-inspect-drag-ignore" };
    return {
      type: "touch-inspect-tap",
      state: inspect.pin ? "pinned" : "transient",
      mode: inspect.mode,
      maxDistance: inspect.maxDistance,
    };
  }

  if (!brushing || brushCorners === null) return { type: "none" };
  return {
    type: "finish-brush",
    source: interactionSourceFromPointerType(pointerType),
    finish: resolvePointerFinishBrushAction({
      brushCorners,
      endPoint,
      activeTool,
    }),
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
 * Nearest-candidate radius (plot px) for capture-surface point-tool click.
 * Host `onCaptureClick` toggle-point nearest lookup uses this radius.
 */
export const POINT_SELECT_NEAREST_MAX_DISTANCE_PX = 24;

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
  /** Host: resolved `interactionConfig.inspect` (domain object, not a boolean). */
  readonly inspect: SurfaceInspectConfig;
};

export type SurfacePointerMoveAction =
  | { readonly type: "touch-inspect-drag-cancel" }
  | { readonly type: "queue-area-move"; readonly source: "touch" | "pointer" }
  | {
      readonly type: "queue-inspect";
      readonly source: "touch" | "pointer";
      /** Nearest-query params from inspect snapshot at decision time. */
      readonly mode: "auto" | "exact" | "x" | "y" | "xy";
      readonly maxDistance: number;
    }
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
 * not cancel). Cancel does **not** require inspect config — only the inspect
 * tool, matching the current host.
 *
 * Host advances `touchInspectMoved` separately on touch+start before calling.
 * Host on cancel: clear `queuedPointerInspection`, cancel scheduled pointer
 * (`queuedPointerToken` left untouched). Host on queue-inspect: nearest with
 * action.mode / action.maxDistance (no config re-read).
 */
export function resolvePointerMoveAction(input: SurfacePointerMoveInput): SurfacePointerMoveAction {
  const {
    pointerType,
    activeTool,
    touchInspectMoved,
    hasTouchInspectStart,
    brushing,
    hasBrushDraft,
    inspect,
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

  if (activeTool === "inspect" && inspect !== null) {
    return {
      type: "queue-inspect",
      source: pointerSource(pointerType),
      mode: inspect.mode,
      maxDistance: inspect.maxDistance,
    };
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
