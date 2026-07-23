/**
 * Authoritative cross-module seam for chart-local interaction transitions.
 *
 * Pointer, keyboard, legend, and programmatic inputs route sibling operations
 * through this port instead of deferred controller getters. The transition
 * owner populates the port after constructing internal modules.
 */
import type { CandidateFacts, CellValue, RenderModel, ScenePanel } from "@ggsvelte/core";

import type { ContinuousZoomDomains } from "../scene/geometry.js";
import type { BrushRect } from "../surface/surface-handlers.js";
import type { SceneHit } from "../surface/plot-px.js";
import type { createInteractionReducer } from "./reducer.js";
import type { InteractionAction, PointerScheduleKind } from "./reducer.js";
import type {
  InteractionSource,
  InteractionTool,
  IntervalSelection,
  PlotInspectionChange,
  PlotSelection,
} from "./interaction.js";

/** Component-held reducer shape — factory creates it inside surface. */
type InteractionReducer = ReturnType<typeof createInteractionReducer>;

/** Inspect frame action delivered to onPointerFrame (non-move-area branch). */
export type InspectPointerFrameAction = Extract<InteractionAction, { type: "inspect" }>;

/** Intent for a coalesced pointer-inspect frame (nearest lookup owned by inspection). */
export type SchedulePointerInspectInput = {
  readonly point: Readonly<{ x: number; y: number }>;
  readonly source: InteractionSource;
  readonly mode: "auto" | "exact" | "x" | "y" | "xy";
  readonly maxDistance: number;
};

/** Cancel policy for pending pointer-inspect work. */
export type CancelPointerInspectPolicy = {
  readonly pendingPinned: "preserve" | "discard";
};

/**
 * Cross-module interaction transition port. Read accessors and command methods
 * are wired by the transition owner; leaf modules must not invoke port methods
 * during construction.
 */
export interface InteractionTransitionPort {
  // --- Inspection ---
  readonly inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null;
  readonly inspectionPanel: ScenePanel | null;
  schedulePointerInspect(input: SchedulePointerInspectInput): void;
  cancelPointerInspect(policy: CancelPointerInspectPolicy): void;
  onInspectPointerFrame(action: InspectPointerFrameAction): boolean;
  setInspection(
    hit: SceneHit | null,
    source: InteractionSource,
    state?: "transient" | "pinned",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ): void;
  closeInspection(source: InteractionSource, restoreFocus?: boolean): void;
  dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts?: { restoreFocus?: boolean; returnToInspect?: boolean },
  ): void;
  toggleInspectionPin(source: InteractionSource): void;
  navigateDirection(dx: number, dy: number): void;
  cycleCoincident(delta: number): void;
  resetTraversalIndex(): void;

  // --- Surface / reducer ---
  readonly reducer: InteractionReducer;
  readonly activeTool: InteractionTool;
  readonly committedInterval: IntervalSelection | null;
  clearBrush(): void;
  chooseTool(next: InteractionTool): void;
  clearTouchInspectStart(): void;
  cancelScheduledPointer(kind?: PointerScheduleKind): void;
  dispatchReducer(action: InteractionAction): void;

  // --- Interval ---
  finishBrushSelect(eventValue: IntervalSelection, source: InteractionSource): void;

  // --- Zoom ---
  applyBrushZoom(rect: BrushRect, source: InteractionSource): void;
  commitZoom(domains: ContinuousZoomDomains | null, source: InteractionSource): void;

  // --- Selection ---
  emitSelection(event: PlotSelection): void;
  togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void;

  // --- Semantic resolution (surface handlers) ---
  semanticKey(row: Record<string, CellValue> | null, index: number | null): PropertyKey | null;
  candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[];

  // --- Model (surface handlers, interval bounds) ---
  readonly model: RenderModel | null;
}

/** Module handles populated incrementally by the transition owner. */
export type InteractionTransitionWiring = {
  inspection?: {
    readonly inspection: PlotInspectionChange<Record<string, CellValue>, PropertyKey> | null;
    readonly inspectionPanel: ScenePanel | null;
    schedulePointerInspect(input: SchedulePointerInspectInput): void;
    cancelPointerInspect(policy: CancelPointerInspectPolicy): void;
    onInspectPointerFrame(action: InspectPointerFrameAction): boolean;
    setInspection(
      hit: SceneHit | null,
      source: InteractionSource,
      state?: "transient" | "pinned",
      concreteMode?: "exact" | "x" | "y" | "xy",
      candidate?: CandidateFacts,
    ): void;
    closeInspection(source: InteractionSource, restoreFocus?: boolean): void;
    dismissInspection(
      kind: "escape" | "close",
      source: InteractionSource,
      opts?: { restoreFocus?: boolean; returnToInspect?: boolean },
    ): void;
    toggleInspectionPin(source: InteractionSource): void;
    navigateDirection(dx: number, dy: number): void;
    cycleCoincident(delta: number): void;
    resetTraversalIndex(): void;
  };
  surface?: {
    readonly reducer: InteractionReducer;
    readonly activeTool: InteractionTool;
    clearBrush(): void;
    chooseTool(next: InteractionTool): void;
    clearTouchInspectStart(): void;
  };
  interval?: {
    readonly committedInterval: IntervalSelection | null;
    finishBrushSelect(eventValue: IntervalSelection, source: InteractionSource): void;
  };
  zoom?: {
    applyBrushZoom(rect: BrushRect, source: InteractionSource): void;
    commitZoom(domains: ContinuousZoomDomains | null, source: InteractionSource): void;
  };
  selection?: {
    emitSelection(event: PlotSelection): void;
    togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void;
  };
  semanticKey?: (row: Record<string, CellValue> | null, index: number | null) => PropertyKey | null;
  candidateSemanticKeys?: (candidate: CandidateFacts) => PropertyKey[];
  model?: () => RenderModel | null;
};

export function bindInteractionTransitionPort(
  wiring: InteractionTransitionWiring,
): InteractionTransitionPort {
  const requireInspection = (): NonNullable<InteractionTransitionWiring["inspection"]> => {
    const inspection = wiring.inspection;
    if (inspection === undefined)
      throw new TypeError("InteractionTransitionPort inspection wiring is not ready.");
    return inspection;
  };
  const requireSurface = (): NonNullable<InteractionTransitionWiring["surface"]> => {
    const surface = wiring.surface;
    if (surface === undefined)
      throw new TypeError("InteractionTransitionPort surface wiring is not ready.");
    return surface;
  };
  const requireInterval = (): NonNullable<InteractionTransitionWiring["interval"]> => {
    const interval = wiring.interval;
    if (interval === undefined)
      throw new TypeError("InteractionTransitionPort interval wiring is not ready.");
    return interval;
  };
  const requireZoom = (): NonNullable<InteractionTransitionWiring["zoom"]> => {
    const zoom = wiring.zoom;
    if (zoom === undefined)
      throw new TypeError("InteractionTransitionPort zoom wiring is not ready.");
    return zoom;
  };
  const requireSelection = (): NonNullable<InteractionTransitionWiring["selection"]> => {
    const selection = wiring.selection;
    if (selection === undefined)
      throw new TypeError("InteractionTransitionPort selection wiring is not ready.");
    return selection;
  };

  const port: InteractionTransitionPort = {
    get inspection() {
      return requireInspection().inspection;
    },
    get inspectionPanel() {
      return requireInspection().inspectionPanel;
    },
    schedulePointerInspect(input) {
      requireInspection().schedulePointerInspect(input);
    },
    cancelPointerInspect(policy) {
      requireInspection().cancelPointerInspect(policy);
    },
    onInspectPointerFrame(action) {
      return requireInspection().onInspectPointerFrame(action);
    },
    setInspection(...args) {
      requireInspection().setInspection(...args);
    },
    closeInspection(source, restoreFocus) {
      requireInspection().closeInspection(source, restoreFocus);
    },
    dismissInspection(...args) {
      requireInspection().dismissInspection(...args);
    },
    toggleInspectionPin(source) {
      requireInspection().toggleInspectionPin(source);
    },
    navigateDirection(dx, dy) {
      requireInspection().navigateDirection(dx, dy);
    },
    cycleCoincident(delta) {
      requireInspection().cycleCoincident(delta);
    },
    resetTraversalIndex() {
      requireInspection().resetTraversalIndex();
    },
    get reducer() {
      return requireSurface().reducer;
    },
    get activeTool() {
      return requireSurface().activeTool;
    },
    get committedInterval() {
      return requireInterval().committedInterval;
    },
    clearBrush() {
      requireSurface().clearBrush();
    },
    chooseTool(next) {
      requireSurface().chooseTool(next);
    },
    clearTouchInspectStart() {
      requireSurface().clearTouchInspectStart();
    },
    cancelScheduledPointer(kind) {
      requireSurface().reducer.cancelScheduledPointer(kind);
    },
    dispatchReducer(action) {
      requireSurface().reducer.dispatch(action);
    },
    finishBrushSelect(eventValue, source) {
      requireInterval().finishBrushSelect(eventValue, source);
    },
    applyBrushZoom(rect, source) {
      requireZoom().applyBrushZoom(rect, source);
    },
    commitZoom(domains, source) {
      requireZoom().commitZoom(domains, source);
    },
    emitSelection(event) {
      requireSelection().emitSelection(event);
    },
    togglePointKeys(keys, source) {
      requireSelection().togglePointKeys(keys, source);
    },
    semanticKey(row, index) {
      const semanticKey = wiring.semanticKey;
      if (semanticKey === undefined)
        throw new TypeError("InteractionTransitionPort semanticKey wiring is not ready.");
      return semanticKey(row, index);
    },
    candidateSemanticKeys(candidate) {
      const candidateSemanticKeys = wiring.candidateSemanticKeys;
      if (candidateSemanticKeys === undefined)
        throw new TypeError("InteractionTransitionPort candidateSemanticKeys wiring is not ready.");
      return candidateSemanticKeys(candidate);
    },
    get model() {
      return wiring.model?.() ?? null;
    },
  };
  return Object.freeze(port);
}
