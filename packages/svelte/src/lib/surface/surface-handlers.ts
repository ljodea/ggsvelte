/**
 * Imperative surface input handlers for createSurfaceState.
 *
 * Owns pointer/keyboard/capture side-effect switches and the private brush/
 * selection helpers they share. Reactive state ($state/$derived) and phased
 * effects stay in surface-state.svelte.ts; this module receives live bindings
 * so rAF frames and pointer-leave microtasks never read stale snapshots.
 */
import type {
  InteractionSource,
  InteractionTool,
  IntervalSelection,
} from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import { brushAtPoint, brushWithEnd } from "./area-brush.js";
import type { FinishBrushAction } from "./brush-finish.js";
import { resolveChooseToolAction } from "../interaction/capability.js";
import { normalizedRect, panelContainingAnchor } from "../scene/geometry.js";
import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  type IntervalQueryScene,
} from "../interval/query.js";
import { BRUSH_SECOND_CORNER_ANNOUNCEMENT } from "../assembly/labels.js";
import { hitFromCandidate, plotPointFromClient } from "./plot-px.js";
import { resolveSurfaceBlurAction } from "../inspection/teardown.js";
import { resolveSurfaceKeyAction } from "./keyboard.js";
import {
  advanceTouchInspectMoved,
  POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
  resolveCaptureClickAction,
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerMoveAction,
  resolvePointerUpAction,
  shouldClearInspectionOnPointerLeave,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
} from "./pointer.js";
import type { SurfaceStateDeps } from "./surface-state.svelte.js";

type InteractionReducer = ReturnType<typeof createInteractionReducer>;

export type BrushRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** Live bindings into surface-state owned fields (must not snapshot). */
export type SurfaceHandlerLive = {
  readonly deps: SurfaceStateDeps;
  readonly reducer: InteractionReducer;
  readonly getActiveTool: () => InteractionTool;
  readonly getBrushing: () => boolean;
  readonly getAreaAwaitingSecond: () => boolean;
  readonly getBrushRect: () => BrushRect | null;
  readonly setBrushRect: (next: BrushRect | null) => void;
};

export type SurfaceHandlers = {
  clearBrush(): void;
  chooseTool(next: InteractionTool): void;
  applyAreaMove(point: Readonly<{ x: number; y: number }>, source?: InteractionSource): void;
  onPointerMove(event: PointerEvent): void;
  onPointerDown(event: PointerEvent): void;
  onPointerUp(event: PointerEvent): void;
  onPointerLeave(): void;
  onPointerCancel(): void;
  onLostPointerCapture(): void;
  onCaptureClick(event: MouseEvent): void;
  onSurfaceKeyDown(event: KeyboardEvent): void;
  onSurfaceBlur(event: FocusEvent): void;
  clearTouchInspectStart(): void;
};

export function createSurfaceHandlers(live: SurfaceHandlerLive): SurfaceHandlers {
  const { deps, reducer } = live;

  let queuedAreaSource: InteractionSource = "pointer";
  let touchInspectStart: { x: number; y: number } | null = null;
  let touchInspectMoved = false;
  let suppressClickUntil = 0;

  function clearBrush(): void {
    live.setBrushRect(null);
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
        live.setBrushRect(null);
        // set-tool already full-cancels the schedule; clear inspect payload only
        // (preserve pinned stash — matches prior clearQueuedPointer-only path).
        deps.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
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
      activeTool: live.getActiveTool(),
      touchInspectMoved,
      hasTouchInspectStart: touchInspectStart !== null,
      brushing: live.getBrushing(),
      hasBrushDraft: live.getBrushRect() !== null,
      inspect: deps.inspectConfig(),
    });
    switch (action.type) {
      case "touch-inspect-drag-cancel":
        deps.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
        return;
      case "queue-area-move":
        queuedAreaSource = action.source;
        reducer.queuePointer({ type: "move-area", point: p });
        return;
      case "queue-inspect":
        // mode/maxDistance from pure snapshot — no inspect config re-gate.
        // Inspection owns nearest lookup, token, and reducer.queuePointer.
        deps.inspection().schedulePointerInspect({
          point: p,
          source: action.source,
          mode: action.mode,
          maxDistance: action.maxDistance,
        });
        break;
      case "none":
        break;
    }
  }

  function applyAreaMove(
    point: Readonly<{ x: number; y: number }>,
    source: InteractionSource = queuedAreaSource,
  ): void {
    const draft = live.getBrushRect();
    if (!live.getBrushing() || draft === null) return;
    const next = brushWithEnd(draft, point);
    live.setBrushRect(next);
    if (live.getActiveTool() === "select-area")
      deps.emitSelection(selectionEvent("change", normalizedRect(next), source));
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
        live.setBrushRect(finish.corners);
        deps.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        break;
      case "select-end": {
        live.setBrushRect(null);
        const eventValue = selectionEvent("end", finish.rect, source);
        // Interval owns commit + emit; surface only routes FinishBrushAction.
        deps.interval().finishBrushSelect(eventValue, source);
        reducer.dispatch({ type: "cancel-area" });
        break;
      }
      case "zoom-end":
        live.setBrushRect(null);
        deps.zoom().applyBrushZoom(finish.rect, source);
        reducer.dispatch({ type: "cancel-area" });
        break;
      case "end-area":
        // Commit with non-area tool (e.g. tool changed mid-drag): clear only.
        live.setBrushRect(null);
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

  function onPointerLeave(): void {
    // Evaluate leave clear **inside** the microtask so live.getBrushing()/tooltip
    // reflect post-flush state (not leave-time snapshots).
    queueMicrotask(() => {
      if (
        !shouldClearInspectionOnPointerLeave({
          brushing: live.getBrushing(),
          tooltipHovered: deps.tooltipHovered(),
        })
      )
        return;
      deps.inspection().cancelPointerInspect({ pendingPinned: "discard" });
      reducer.cancelScheduledPointer();
      deps.inspection().setInspection(null, "pointer");
    });
  }

  function onPointerDown(event: PointerEvent): void {
    // Always cancel queued inspection before pure routing (host cleanup).
    // Preserve pinned stash; full schedule cancel (inspect + move-area).
    deps.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    reducer.cancelScheduledPointer();
    // point always computed (pure begin-area needs it; touch/none ignore).
    const p = plotPoint(event);
    const action = resolvePointerDownAction({
      pointerType: event.pointerType,
      button: event.button,
      activeTool: live.getActiveTool(),
      areaAwaitingSecond: live.getAreaAwaitingSecond(),
      brushCorners: live.getBrushRect(),
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
        const extending = live.getAreaAwaitingSecond() && live.getBrushRect() !== null;
        const model = deps.model();
        const originPanel = extending
          ? area.kind === "idle"
            ? null
            : (model?.scene.panels.find((panel) => panel.id === area.panelId) ?? null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        // Pure table owns fresh vs extend corner policy.
        live.setBrushRect(action.corners);
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
      activeTool: live.getActiveTool(),
      inspect: deps.inspectConfig(),
      hasTouchInspectStart: touchInspectStart !== null,
      touchInspectMoved,
      brushing: live.getBrushing(),
      brushCorners: live.getBrushRect(),
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
    // live.getBrushing()); nudge/complete-area carry pure payloads so host only applies.
    const inspection = deps.inspection();
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool: live.getActiveTool(),
      brushCorners: live.getBrushRect(),
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
        live.setBrushRect(action.corners);
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
        live.setBrushRect(brushAtPoint(action.anchor));
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
      activeTool: live.getActiveTool(),
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
    // Preserve pinned stash (leave discards; cancel preserves).
    deps.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    touchInspectStart = null;
    touchInspectMoved = false;
    reducer.cancelScheduledPointer();
    live.setBrushRect(null);
    reducer.dispatch({ type: "cancel-area" });
  }

  /**
   * Lost capture: pure decision table owns keep vs clear draft; host mutates
   * live.getBrushRect() and always cancels area when not ignored.
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
        live.setBrushRect(null);
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

  function clearTouchInspectStart(): void {
    touchInspectStart = null;
  }

  return {
    clearBrush,
    chooseTool,
    applyAreaMove,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onLostPointerCapture,
    onCaptureClick,
    onSurfaceKeyDown,
    onSurfaceBlur,
    clearTouchInspectStart,
  };
}
