/**
 * Surface controller extracted from GGPlot for S7.
 *
 * Owns the interaction reducer (+ revision), tool/brush/touch state,
 * construction-time deriveds (activeTool, surfaceDescription, brushing,
 * areaAwaitingSecond), both surface effects (window-teardown then tool-sync),
 * and the full pointer/keyboard/capture handler cluster.
 *
 * Construction topology (host): inspectionState is FIRST; this factory sits at
 * the original reducer position. Construction-time deriveds read ONLY module-
 * internal state + inspectConfig. Sibling controllers, sinks, and chrome
 * getters are handler/effect-only (armed for the construction guard).
 *
 * Effects register via registerSurfaceEffects() at the original line-810
 * position (after diagnostics effects, before catalog/focus/inspection).
 */
import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import type { SceneHitIndex } from "@ggsvelte/core/dom";

import type { InspectionState } from "../inspection-state.svelte.js";
import type { IntervalState } from "../interval-state.svelte.js";
import type {
  InteractionSource,
  InteractionTool,
  IntervalSelection,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import { brushAtPoint, brushWithEnd } from "./area-brush.js";
import type { FinishBrushAction } from "./brush-finish.js";
import { resolveChooseToolAction, resolveEffectiveTool } from "../interaction/capability.js";
import { normalizedRect, panelContainingAnchor } from "../scene/geometry.js";
import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  type IntervalQueryScene,
} from "../plot-interval-query.js";
import { BRUSH_SECOND_CORNER_ANNOUNCEMENT } from "../assembly/labels.js";
import { hitFromCandidate, plotPointFromClient } from "./plot-px.js";
import { buildQueuedInspectFrame } from "../plot-surface-inspection-frame.js";
import {
  resolveSurfaceBlurAction,
  shouldClosePinnedOnOutsidePointer,
} from "../plot-surface-inspection-teardown.js";
import { resolveSurfaceKeyAction } from "./keyboard.js";
import {
  advanceTouchInspectMoved,
  isAreaAwaitingSecond,
  isAreaBrushing,
  POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
  resolveCaptureClickAction,
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerMoveAction,
  resolvePointerUpAction,
  shouldClearInspectionOnPointerLeave,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
} from "./pointer.js";
import type { PlotZoomState } from "../zoom/zoom-state.svelte.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Component-held reducer shape — factory creates it inside the module. */
type InteractionReducer = ReturnType<typeof createInteractionReducer>;

export type SurfaceStateDeps = {
  model: () => RenderModel | null;
  coordFlipped: () => boolean;
  root: () => HTMLDivElement | null;
  /** Controlled-tool prop + resolved config/chrome (host/S8-held). */
  toolProp: () => InteractionTool | undefined;
  initialTool: () => ResolvedInteractionConfig["initialTool"];
  availableTools: () => readonly InteractionTool[];
  inspectConfig: () => ResolvedInteractionConfig["inspect"];
  selectConfig: () => ResolvedInteractionConfig["select"];
  /**
   * Host's `canPublishPointSelection` derived (declared after this factory —
   * handler-only). Single source of truth with ToolRail/chrome consumers.
   */
  pointSelectEnabled: () => boolean;
  ontoolchange: () => ((tool: InteractionTool) => void) | undefined;
  /**
   * Required by the window-teardown effect — NOT derivable from filtered
   * availableTools (codex P1-4).
   */
  surfaceInteractive: () => boolean;
  /** Pointer-move nearest-candidate fallback reads it. */
  hitIndex: () => SceneHitIndex | null;
  /** Capture-click reads it — deferred closure, same #165 pattern. */
  candidateSemanticKeys: (candidate: CandidateFacts) => PropertyKey[];
  /** Sibling controllers (handler-only; inspection earlier, interval later). */
  inspection: () => Pick<
    InspectionState,
    | "inspection"
    | "inspectionPanel"
    | "applyQueuedInspectFrame"
    | "queuePointerFrame"
    | "clearQueuedPointer"
    | "clearPendingPinned"
    | "setInspection"
    | "closeInspection"
    | "dismissInspection"
    | "toggleInspectionPin"
    | "navigateDirection"
    | "cycleCoincident"
    | "resetTraversalIndex"
  >;
  interval: () => Pick<IntervalState, "applyBrushSelectEnd" | "committedInterval">;
  zoom: () => Pick<PlotZoomState, "applyBrushZoom">;
  /** S8 host-held sinks. */
  emitSelection: (event: PlotSelection) => void;
  semanticKey: (row: Record<string, CellValue> | null, index: number | null) => PropertyKey | null;
  togglePointKeys: (keys: readonly PropertyKey[], source: InteractionSource) => void;
  tooltipHovered: () => boolean;
  announce: (message: string) => void;
};

export type SurfaceState = {
  readonly reducer: InteractionReducer;
  readonly activeTool: InteractionTool;
  readonly surfaceDescription: string;
  readonly brushRect: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null;
  readonly areaAwaitingSecond: boolean;
  clearBrush(): void;
  chooseTool(next: InteractionTool): void;
  onPointerMove(event: PointerEvent): void;
  onPointerDown(event: PointerEvent): void;
  onPointerUp(event: PointerEvent): void;
  onPointerLeave(): void;
  onPointerCancel(): void;
  onLostPointerCapture(): void;
  onCaptureClick(event: MouseEvent): void;
  onSurfaceKeyDown(event: KeyboardEvent): void;
  onSurfaceBlur(event: FocusEvent): void;
  /** Register window-teardown + tool-sync effects at the original host site. */
  registerSurfaceEffects(): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the surface controller. Construction registers only the
 * construction-time deriveds. Call `registerSurfaceEffects` at the original
 * line-810 position (after diagnostics, before catalog/focus/inspection).
 *
 * Construction-order note: deps must not be invoked during construction —
 * construction-read discipline enforced by the armed-getter suite.
 */
export function createSurfaceState(deps: SurfaceStateDeps): SurfaceState {
  let reducerRevision = $state(0);
  let queuedAreaSource: InteractionSource = "pointer";
  // Reducer is created INSIDE the factory (original host position ~516).
  const reducer = createInteractionReducer({
    onChange: () => {
      reducerRevision += 1;
    },
    scheduleFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => {
      cancelAnimationFrame(handle as number);
    },
    onPointerFrame: (action) => {
      if (action.type === "move-area") {
        applyAreaMove(action.point, queuedAreaSource);
      } else {
        deps.inspection().applyQueuedInspectFrame(action);
      }
    },
  });

  // Construction-safe: own state + inspectConfig only.
  const activeTool = $derived.by(() => {
    void reducerRevision;
    return reducer.state.tool;
  });
  const surfaceDescription = $derived.by(() => {
    if (activeTool === "select-area")
      return "Press Enter or Space to set the first selection corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the selection. Press Escape to cancel.";
    if (activeTool === "zoom-area")
      return "Press Enter or Space to set the first zoom corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the zoom. Press Escape to cancel.";
    if (activeTool === "point")
      return "Use Arrow keys to inspect data. Press Enter or Space to toggle the focused point selection. Press Escape to dismiss.";
    return deps.inspectConfig()?.pin === true
      ? "Use Arrow keys to inspect data. Press Enter or Space to pin. Press Escape to dismiss."
      : "Use Arrow keys to inspect data. Press Escape to dismiss.";
  });

  let touchInspectStart: { x: number; y: number } | null = null;
  let touchInspectMoved = false;
  let suppressClickUntil = 0;
  let brushRect = $state<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  // Private — no remaining host consumer after extraction (codex P2-7).
  const brushing = $derived.by(() => {
    void reducerRevision;
    return isAreaBrushing(reducer.state.area.kind);
  });
  const areaAwaitingSecond = $derived.by(() => {
    void reducerRevision;
    return isAreaAwaitingSecond(reducer.state.area.kind);
  });

  function clearBrush(): void {
    brushRect = null;
  }

  function chooseTool(next: InteractionTool): void {
    // Decision table is pure (interaction/capability); this switch owns side effects.
    const action = resolveChooseToolAction({
      next,
      available: deps.availableTools(),
      isControlled: deps.toolProp() !== undefined,
    });
    switch (action.type) {
      case "ignore":
        return;
      case "request":
        deps.ontoolchange()?.(next);
        return;
      case "apply":
        reducer.dispatch({ type: "set-tool", tool: next });
        brushRect = null;
        deps.inspection().clearQueuedPointer();
        reducer.cancelScheduledPointer();
        deps.ontoolchange()?.(next);
        break;
    }
  }

  function plotPoint(event: PointerEvent | MouseEvent): {
    x: number;
    y: number;
  } {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const scene = deps.model()?.scene;
    if (scene === undefined) return { x: 0, y: 0 };
    return plotPointFromClient(event.clientX, event.clientY, rect, scene);
  }

  /** Private — only consumer is the pointer-frame builder. */
  function panelId(index: number): string | null {
    const panel = deps.model()?.scene.panels[index];
    if (panel === undefined) return null;
    return panel.id;
  }

  function panelAtPoint(point: Readonly<{ x: number; y: number }>) {
    const panels = deps.model()?.scene.panels ?? [];
    // Same inclusive-bounds find as inspection-panel resolution (DRY),
    // plus the surface-only single-panel fallback.
    return panelContainingAnchor(panels, point) ?? (panels.length === 1 ? panels[0]! : null);
  }

  function onPointerMove(event: PointerEvent): void {
    const p = plotPoint(event);
    // Sticky threshold is pure; host only advances on touch + start set.
    if (event.pointerType === "touch" && touchInspectStart !== null) {
      touchInspectMoved = advanceTouchInspectMoved(touchInspectMoved, touchInspectStart, p);
    }
    // Decision table is pure (surface/pointer); this switch owns queues.
    const action = resolvePointerMoveAction({
      pointerType: event.pointerType,
      activeTool,
      touchInspectMoved,
      hasTouchInspectStart: touchInspectStart !== null,
      brushing,
      hasBrushDraft: brushRect !== null,
      inspect: deps.inspectConfig(),
    });
    switch (action.type) {
      case "touch-inspect-drag-cancel":
        deps.inspection().clearQueuedPointer();
        reducer.cancelScheduledPointer();
        return;
      case "queue-area-move":
        queuedAreaSource = action.source;
        reducer.queuePointer({ type: "move-area", point: p });
        return;
      case "queue-inspect": {
        // mode/maxDistance from pure snapshot — no inspect config re-gate.
        const model = deps.model();
        const match =
          model?.candidates.nearest(p.x, p.y, {
            mode: action.mode,
            maxDistance: action.maxDistance,
          }) ?? null;
        // One null branch for hit + reducer candidate (lazy hitTest / panelId).
        const frame = buildQueuedInspectFrame({
          match,
          source: action.source,
          epoch: model?.runId ?? 0,
          fallbackHit: () => deps.hitIndex()?.hitTest(p.x, p.y) ?? null,
          panelIdForIndex: (index) => panelId(index),
        });
        deps.inspection().queuePointerFrame(frame.queued, reducer.frameToken());
        reducer.queuePointer({
          type: "inspect",
          candidate: frame.candidate,
          source: action.source,
        });
        break;
      }
      case "none":
        break;
    }
  }

  function applyAreaMove(
    point: Readonly<{ x: number; y: number }>,
    source: InteractionSource,
  ): void {
    if (!brushing || brushRect === null) return;
    brushRect = brushWithEnd(brushRect, point);
    if (activeTool === "select-area")
      deps.emitSelection(selectionEvent("change", normalizedRect(brushRect), source));
  }

  /** Map the live render model into the pure interval query scene adapter. */
  function intervalQueryScene(): IntervalQueryScene | null {
    const model = deps.model();
    if (model === null) return null;
    return intervalQuerySceneFromModel(model, deps.coordFlipped());
  }

  /**
   * Shared select/zoom/end/keep-second-corner effects after pure finish-brush
   * routing (pointer finish-brush and keyboard complete-area).
   * Pointer-only: callers must cancel scheduled pointer before this when needed.
   */
  function applyFinishBrush(finish: FinishBrushAction, source: InteractionSource): void {
    switch (finish.type) {
      case "keep-second-corner":
        brushRect = finish.corners;
        deps.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        break;
      case "select-end": {
        brushRect = null;
        const eventValue = selectionEvent("end", finish.rect, source);
        // Writes (committedInterval + conditional record) then host emit —
        // order unchanged from the pre-extraction select-end branch.
        deps.interval().applyBrushSelectEnd(eventValue, source);
        deps.emitSelection(eventValue);
        reducer.dispatch({ type: "cancel-area" });
        break;
      }
      case "zoom-end":
        brushRect = null;
        deps.zoom().applyBrushZoom(finish.rect, source);
        reducer.dispatch({ type: "cancel-area" });
        break;
      case "end-area":
        // Commit with non-area tool (e.g. tool changed mid-drag): clear only.
        brushRect = null;
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

  function onPointerLeave(): void {
    // Evaluate leave clear **inside** the microtask so brushing/tooltip
    // reflect post-flush state (not leave-time snapshots).
    queueMicrotask(() => {
      if (
        !shouldClearInspectionOnPointerLeave({
          brushing,
          tooltipHovered: deps.tooltipHovered(),
        })
      )
        return;
      deps.inspection().clearQueuedPointer();
      deps.inspection().clearPendingPinned();
      reducer.cancelScheduledPointer();
      deps.inspection().setInspection(null, "pointer");
    });
  }

  function onPointerDown(event: PointerEvent): void {
    // Always cancel queued inspection before pure routing (host cleanup).
    deps.inspection().clearQueuedPointer();
    reducer.cancelScheduledPointer();
    // point always computed (pure begin-area needs it; touch/none ignore).
    const p = plotPoint(event);
    const action = resolvePointerDownAction({
      pointerType: event.pointerType,
      button: event.button,
      activeTool,
      areaAwaitingSecond,
      brushCorners: brushRect,
      point: p,
    });
    switch (action.type) {
      case "touch-inspect-start":
        touchInspectStart = p;
        touchInspectMoved = false;
        break;
      case "none":
        break;
      case "begin-area": {
        // R3: the brush is panel-scoped — extending stays on the origin
        // panel from the reducer; a fresh brush anchors to the hit panel.
        const area = reducer.state.area;
        const extending = areaAwaitingSecond && brushRect !== null;
        const model = deps.model();
        const originPanel = extending
          ? area.kind === "idle"
            ? null
            : (model?.scene.panels.find((panel) => panel.id === area.panelId) ?? null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        // Pure table owns fresh vs extend corner policy.
        brushRect = action.corners;
        deps.inspection().setInspection(null, action.source);
        reducer.dispatch({
          type: "begin-area",
          point: p,
          panelId: originPanel.id,
        });
        if (action.emitSelectStart) {
          const startEvent = selectionEvent("start", normalizedRect(action.corners), action.source);
          deps.emitSelection(startEvent);
        }
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        } catch {
          // Synthetic events may not register a browser pointer id. The
          // reducer still owns cancellation; real pointer streams retain
          // capture.
        }
        break;
      }
    }
  }

  function selectionEvent(
    phase: IntervalSelection["phase"],
    rect: ReturnType<typeof normalizedRect>,
    source: InteractionSource,
  ): IntervalSelection {
    const originPanelId =
      reducer.state.area.kind === "idle"
        ? deps.interval().committedInterval?.panelId
        : reducer.state.area.panelId;
    return buildIntervalSelectionFromScene({
      phase,
      mode: deps.selectConfig()?.mode ?? "xy",
      source,
      pixels: rect,
      scene: intervalQueryScene(),
      ...(originPanelId !== undefined && { panelId: originPanelId }),
      keyForRow: (rowIndex) => deps.semanticKey(deps.model()?.row(rowIndex) ?? null, rowIndex),
    });
  }

  function onPointerUp(event: PointerEvent): void {
    // endPoint always computed (pure finish-brush needs it; touch paths ignore).
    const endPoint = plotPoint(event);
    const action = resolvePointerUpAction({
      pointerType: event.pointerType,
      activeTool,
      inspect: deps.inspectConfig(),
      hasTouchInspectStart: touchInspectStart !== null,
      touchInspectMoved,
      brushing,
      brushCorners: brushRect,
      endPoint,
    });
    switch (action.type) {
      case "touch-inspect-drag-ignore":
        // Always clear touch-inspect start state (host cleanup).
        touchInspectStart = null;
        touchInspectMoved = false;
        break;
      case "touch-inspect-tap": {
        touchInspectStart = null;
        touchInspectMoved = false;
        // mode/maxDistance/state from pure inspect snapshot — no re-gate.
        const match = deps.model()?.candidates.nearest(endPoint.x, endPoint.y, {
          mode: action.mode,
          maxDistance: action.maxDistance,
        });
        if (match !== null && match !== undefined) {
          deps
            .inspection()
            .setInspection(hitFromCandidate(match), "touch", action.state, match.mode, match);
          suppressClickUntil = performance.now() + TOUCH_INSPECT_CLICK_SUPPRESS_MS;
        }
        break;
      }
      case "none":
        break;
      case "finish-brush": {
        // Pure table owns evaluate + select/zoom/end; host cancels then applies.
        reducer.cancelScheduledPointer();
        applyFinishBrush(action.finish, action.source);
        break;
      }
    }
  }

  function onSurfaceBlur(event: FocusEvent): void {
    const blurAction = resolveSurfaceBlurAction({
      relatedTargetInsideRoot: deps.root()?.contains(event.relatedTarget as Node | null) === true,
      inspectionState: deps.inspection().inspection?.state ?? "none",
    });
    if (blurAction.type === "ignore") return;
    // Shared for keep-pinned and clear-inspection (ordering is load-bearing).
    deps.inspection().resetTraversalIndex();
    reducer.dispatch({ type: "set-active", candidate: null });
    if (blurAction.type === "blur-clear-inspection")
      deps.inspection().setInspection(null, "keyboard");
  }

  function onSurfaceKeyDown(event: KeyboardEvent): void {
    // Decision table is pure (surface/keyboard); this switch owns side
    // effects only. brushCorners is the draft source of truth (not reducer
    // brushing); nudge/complete-area carry pure payloads so host only applies.
    const inspection = deps.inspection();
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool,
      brushCorners: brushRect,
      hasInspection: inspection.inspection !== null,
      pinEnabled: deps.inspectConfig()?.pin === true,
      focusKey: inspection.inspection?.focus.key ?? null,
      sourceKeys: inspection.inspection?.focus.sourceKeys ?? [],
      inspectionAnchor: inspection.inspection?.focus.anchor ?? null,
      inspectionPanel: inspection.inspectionPanel,
      firstPanel: deps.model()?.scene.panels[0],
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "nudge-brush": {
        // Pure table owns clamp panel policy and free-corner nudge.
        brushRect = action.corners;
        reducer.dispatch({
          type: "move-area",
          point: { x: action.corners.x1, y: action.corners.y1 },
        });
        return;
      }
      case "begin-area": {
        // Pure table owns inspection-anchor vs panel-center policy.
        // R3: the brush is panel-scoped — anchor to the panel under it.
        const originPanel = panelAtPoint(action.anchor);
        if (originPanel === null) return;
        brushRect = brushAtPoint(action.anchor);
        reducer.dispatch({
          type: "begin-area",
          point: action.anchor,
          panelId: originPanel.id,
        });
        deps.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        return;
      }
      case "complete-area": {
        // finish payload is pure-owned (normalize + select/zoom/end routing).
        applyFinishBrush(action.finish, "keyboard");
        return;
      }
      case "cycle-coincident":
        inspection.cycleCoincident(action.delta);
        return;
      case "navigate-direction":
        inspection.navigateDirection(action.dx, action.dy);
        return;
      case "toggle-point-keys":
        deps.togglePointKeys(action.keys, "keyboard");
        return;
      case "toggle-pin":
        inspection.toggleInspectionPin("keyboard");
        return;
      case "escape":
        inspection.dismissInspection("escape", "keyboard", {
          returnToInspect: action.returnToInspect,
        });
        break;
      case "none":
        break;
    }
  }

  function onCaptureClick(event: MouseEvent): void {
    const inspection = deps.inspection();
    const action = resolveCaptureClickAction({
      suppressClick: performance.now() < suppressClickUntil,
      activeTool,
      pointSelectEnabled: deps.pointSelectEnabled(),
      inspectEnabled: deps.inspectConfig() !== null,
      pinEnabled: deps.inspectConfig()?.pin === true,
      hasInspection: inspection.inspection !== null,
    });
    switch (action.type) {
      case "suppress":
        suppressClickUntil = 0;
        break;
      case "toggle-point": {
        const point = plotPoint(event);
        const match = deps.model()?.candidates.nearest(point.x, point.y, {
          mode: "xy",
          maxDistance: POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
        });
        if (match === null || match === undefined) break;
        deps.togglePointKeys(deps.candidateSemanticKeys(match), "pointer");
        break;
      }
      case "toggle-pin":
        inspection.toggleInspectionPin("pointer");
        break;
      case "none":
        break;
    }
  }

  /** Pointer-cancel always drops draft/queue/touch-inspect and cancels area. */
  function onPointerCancel(): void {
    deps.inspection().clearQueuedPointer();
    touchInspectStart = null;
    touchInspectMoved = false;
    reducer.cancelScheduledPointer();
    brushRect = null;
    reducer.dispatch({ type: "cancel-area" });
  }

  /**
   * Lost capture: pure decision table owns keep vs clear draft; host mutates
   * brushRect and always cancels area when not ignored.
   */
  function onLostPointerCapture(): void {
    const lost = resolveLostPointerCaptureAction(reducer.state.area.kind);
    switch (lost.type) {
      case "ignore":
        break;
      case "cancel-keep-draft":
        reducer.dispatch({ type: "cancel-area" });
        break;
      case "cancel-clear-draft":
        brushRect = null;
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

  function registerSurfaceEffects(): void {
    // Window outside-pointer / blur teardown (original line-810).
    $effect(() => {
      // No-op cleanup keeps every code path returning a teardown (consistent-return).
      if (!deps.surfaceInteractive()) return () => {};
      const onOutsidePointer = (event: PointerEvent) => {
        if (
          !shouldClosePinnedOnOutsidePointer({
            inspectionState: deps.inspection().inspection?.state,
            targetInsideRoot: deps.root()?.contains(event.target as Node) === true,
          })
        )
          return;
        deps.inspection().closeInspection("pointer", false);
      };
      const cancelDraft = () => {
        brushRect = null;
        deps.inspection().clearQueuedPointer();
        touchInspectStart = null;
        reducer.cancelScheduledPointer();
        reducer.dispatch({ type: "cancel-area" });
      };
      window.addEventListener("pointerdown", onOutsidePointer);
      window.addEventListener("blur", cancelDraft);
      return () => {
        window.removeEventListener("pointerdown", onOutsidePointer);
        window.removeEventListener("blur", cancelDraft);
      };
    });

    // Tool-sync (original line-837).
    $effect(() => {
      const next = resolveEffectiveTool(
        deps.toolProp() ?? deps.initialTool(),
        deps.availableTools(),
      );
      reducer.dispatch({ type: "set-tool", tool: next });
    });
  }

  return {
    get reducer() {
      return reducer;
    },
    get activeTool() {
      return activeTool;
    },
    get surfaceDescription() {
      return surfaceDescription;
    },
    get brushRect() {
      return brushRect;
    },
    get areaAwaitingSecond() {
      return areaAwaitingSecond;
    },
    clearBrush,
    chooseTool,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onLostPointerCapture,
    onCaptureClick,
    onSurfaceKeyDown,
    onSurfaceBlur,
    registerSurfaceEffects,
  };
}
