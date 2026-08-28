/**
 * Surface DOM/event handler implementation, extracted from
 * surface-state.svelte.ts for S5 (plan §4).
 *
 * Receives LIVE accessors and actions only (reducer thunk, construction-time
 * derived reads, brush-draft get/set, sibling controller ports, selection
 * sinks) and reads them at event time — handlers never snapshot rune values:
 * `activeTool()`, `brushing()`, and `getBrushRect()` are re-read whenever the
 * event or rAF frame fires.
 *
 * Handler-private non-rune mutable state lives here (touch-inspect start/
 * moved, queued area source, click-suppress deadline); the brush draft stays
 * $state in surface-state, mutated only through `setBrushRect`. Tool
 * selection (`chooseTool`) stays in surface-state and is injected as an
 * action for the Escape dismissal side effects. Pure decision tables remain
 * in pointer.ts, keyboard.ts, area-brush.ts, and capability.ts — this module
 * owns the switches and side effects.
 */
import type { InteractionContext } from "../interaction/interaction-context.svelte.js";
import type {
  InteractionSource,
  InteractionTool,
  IntervalSelection,
} from "../interaction/interaction.js";
import { resolveTarget } from "../interaction/target.js";
import { resolveSurfaceBlurAction } from "../inspection/teardown.js";
import { applyInspectionDismissSideEffects } from "../interaction/transition-owner.js";
import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  type IntervalQueryScene,
} from "../interval/query.js";
import { BRUSH_SECOND_CORNER_ANNOUNCEMENT } from "../assembly/labels.js";
import { normalizedRect, panelBoundsFrom } from "../scene/geometry.js";
import {
  advanceTouchInspectMoved,
  resolveCaptureClickAction,
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerMoveAction,
  resolvePointerUpAction,
  shouldClearInspectionOnPointerLeave,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
} from "./pointer.js";
import { brushAtPoint, brushWithEnd } from "./area-brush.js";
import type { FinishBrushAction } from "./brush-finish.js";
import { resolveSurfaceKeyAction } from "./keyboard.js";
import type { BrushRect, InteractionReducer, SurfaceStateOptions } from "./surface-state.svelte.js";

/** Live ports for the handlers; sibling ports re-picked from SurfaceStateOptions. */
export type SurfaceHandlersPorts = {
  /** Shared interaction context (live getters; handler-only invocation). */
  readonly context: InteractionContext;
  /** Reducer thunk — the reducer is constructed after this factory. */
  readonly reducer: () => InteractionReducer;
  /** Construction-time deriveds, read live at event time — never snapshotted. */
  readonly activeTool: () => InteractionTool;
  readonly brushing: () => boolean;
  readonly areaAwaitingSecond: () => boolean;
  /** Brush draft lives in surface-state $state; mutated only via this pair. */
  readonly getBrushRect: () => BrushRect | null;
  readonly setBrushRect: (rect: BrushRect | null) => void;
  /** Tool selection action (owned by surface-state) for Escape side effects. */
  readonly chooseTool: (next: InteractionTool) => void;
} & Pick<
  SurfaceStateOptions,
  "inspection" | "interval" | "zoom" | "emitSelection" | "togglePointKeys" | "pointSelectEnabled"
>;

export function createSurfaceHandlers(ports: SurfaceHandlersPorts) {
  const { context } = ports;
  const reducerOf = ports.reducer;
  let queuedAreaSource: InteractionSource = "pointer";
  let touchInspectStart: { x: number; y: number } | null = null;
  let touchInspectMoved = false;
  let suppressClickUntil = 0;

  function clearTouchInspect(): void {
    touchInspectStart = null;
    touchInspectMoved = false;
  }

  function plotPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
    const model = context.model();
    if (model === null) return { x: 0, y: 0 };
    const target = event.currentTarget as HTMLElement | null;
    if (target === null) return { x: 0, y: 0 };
    return model.viewport.locate(event.clientX, event.clientY, target.getBoundingClientRect());
  }

  function panelAtPoint(point: Readonly<{ x: number; y: number }>) {
    return context.model()?.viewport.panelAtOrOnly(point) ?? null;
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
      activeTool: ports.activeTool(),
      touchInspectMoved,
      hasTouchInspectStart: touchInspectStart !== null,
      brushing: ports.brushing(),
      hasBrushDraft: ports.getBrushRect() !== null,
      inspect: context.inspectConfig(),
    });
    switch (action.type) {
      case "touch-inspect-drag-cancel":
        ports.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
        return;
      case "queue-area-move":
        queuedAreaSource = action.source;
        reducerOf().queuePointer({ type: "move-area", point: p });
        return;
      case "queue-inspect":
        // Pure snapshot: no re-gate; inspection owns nearest lookup/token.
        ports.inspection().schedulePointerInspect({
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
    const draft = ports.getBrushRect();
    if (!ports.brushing() || draft === null) return;
    const next = brushWithEnd(draft, point);
    ports.setBrushRect(next);
    if (ports.activeTool() === "select-area")
      ports.emitSelection(selectionEvent("change", normalizedRect(next), source));
  }

  /** Map the live render model into the pure interval query scene adapter. */
  function intervalQueryScene(): IntervalQueryScene | null {
    const model = context.model();
    if (model === null) return null;
    return intervalQuerySceneFromModel(model);
  }

  /**
   * Shared finish-brush effects (select/zoom/end); pointer callers cancel first.
   */
  function applyFinishBrush(finish: FinishBrushAction, source: InteractionSource): void {
    switch (finish.type) {
      case "keep-second-corner":
        ports.setBrushRect(finish.corners);
        context.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        break;
      case "select-end": {
        ports.setBrushRect(null);
        const eventValue = selectionEvent("end", finish.rect, source);
        // Interval owns commit + emit; surface only routes FinishBrushAction.
        ports.interval().finishBrushSelect(eventValue, source);
        reducerOf().dispatch({ type: "cancel-area" });
        break;
      }
      case "zoom-end":
        ports.setBrushRect(null);
        ports.zoom().applyBrushZoom(finish.rect, source);
        reducerOf().dispatch({ type: "cancel-area" });
        break;
      case "end-area":
        // Commit with non-area tool (e.g. tool changed mid-drag): clear only.
        ports.setBrushRect(null);
        reducerOf().dispatch({ type: "cancel-area" });
        break;
    }
  }

  function onPointerLeave(): void {
    // Evaluate leave clear **inside** the microtask so brushing/tooltip
    // reflect post-flush state (not leave-time snapshots).
    queueMicrotask(() => {
      if (
        !shouldClearInspectionOnPointerLeave({
          brushing: ports.brushing(),
          tooltipHovered: context.tooltipHovered(),
        })
      )
        return;
      ports.inspection().cancelPointerInspect({ pendingPinned: "discard" });
      reducerOf().cancelScheduledPointer();
      ports.inspection().setInspection(null, "pointer");
    });
  }

  function onPointerDown(event: PointerEvent): void {
    // Always cancel queued inspection before pure routing (host cleanup).
    // Preserve pinned stash; full schedule cancel (inspect + move-area).
    ports.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    reducerOf().cancelScheduledPointer();
    // point always computed (pure begin-area needs it; touch/none ignore).
    const p = plotPoint(event);
    const action = resolvePointerDownAction({
      pointerType: event.pointerType,
      button: event.button,
      activeTool: ports.activeTool(),
      areaAwaitingSecond: ports.areaAwaitingSecond(),
      brushCorners: ports.getBrushRect(),
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
        const area = reducerOf().state.area;
        const extending = ports.areaAwaitingSecond() && ports.getBrushRect() !== null;
        const model = context.model();
        const originPanel = extending
          ? area.kind === "idle" || area.panelId === null
            ? null
            : (model?.viewport.panel(area.panelId) ?? null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        // Pure table owns fresh vs extend corner policy.
        ports.setBrushRect(action.corners);
        ports.inspection().setInspection(null, action.source);
        reducerOf().dispatch({
          type: "begin-area",
          point: p,
          panelId: originPanel.id,
        });
        if (action.emitSelectStart) {
          const startEvent = selectionEvent("start", normalizedRect(action.corners), action.source);
          ports.emitSelection(startEvent);
        }
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        } catch {
          // Synthetic events may not register a pointer id; reducer owns cancel.
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
    const area = reducerOf().state.area;
    const originPanelId =
      area.kind === "idle" ? ports.interval().committedInterval?.panelId : area.panelId;
    return buildIntervalSelectionFromScene({
      phase,
      mode: context.selectConfig()?.mode ?? "xy",
      source,
      pixels: rect,
      scene: intervalQueryScene(),
      ...(originPanelId !== undefined && { panelId: originPanelId }),
      keyForRow: (rowIndex) =>
        context.semanticKey(context.model()?.row(rowIndex) ?? null, rowIndex),
    });
  }

  function onPointerUp(event: PointerEvent): void {
    // endPoint always computed (pure finish-brush needs it; touch paths ignore).
    const endPoint = plotPoint(event);
    const action = resolvePointerUpAction({
      pointerType: event.pointerType,
      activeTool: ports.activeTool(),
      inspect: context.inspectConfig(),
      hasTouchInspectStart: touchInspectStart !== null,
      touchInspectMoved,
      brushing: ports.brushing(),
      brushCorners: ports.getBrushRect(),
      endPoint,
    });
    switch (action.type) {
      case "touch-inspect-drag-ignore":
        // Always clear touch-inspect start state (host cleanup).
        clearTouchInspect();
        break;
      case "touch-inspect-tap": {
        clearTouchInspect();
        // mode/maxDistance/state from pure inspect snapshot — no re-gate.
        // Resolved target owns panel-scoped nearest + tap distance policy (#1080 / #787).
        const model = context.model();
        const target =
          model === null
            ? null
            : resolveTarget({
                model,
                point: endPoint,
                intent: "tap",
                inspect: { mode: action.mode, maxDistance: action.maxDistance },
              });
        if (target !== null) {
          ports.inspection().setInspection(target.match, "touch", action.state, target.mode);
          suppressClickUntil = performance.now() + TOUCH_INSPECT_CLICK_SUPPRESS_MS;
        }
        break;
      }
      case "none":
        break;
      case "finish-brush": {
        // Pure table owns evaluate + select/zoom/end; host cancels then applies.
        reducerOf().cancelScheduledPointer();
        applyFinishBrush(action.finish, action.source);
        break;
      }
    }
  }

  function onSurfaceBlur(event: FocusEvent): void {
    const blurAction = resolveSurfaceBlurAction({
      relatedTargetInsideRoot:
        context.root()?.contains(event.relatedTarget as Node | null) === true,
      inspectionState: ports.inspection().inspection?.state ?? "none",
    });
    if (blurAction.type === "ignore") return;
    // Shared for keep-pinned and clear-inspection (ordering is load-bearing).
    ports.inspection().resetTraversalIndex();
    ports.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    if (blurAction.type === "blur-clear-inspection")
      ports.inspection().setInspection(null, "keyboard");
  }

  function onSurfaceKeyDown(event: KeyboardEvent): void {
    // Decision table is pure (surface/keyboard); this switch owns side
    // effects only. brushCorners is the draft source of truth (not reducer
    // brushing); nudge/complete-area carry pure payloads so host only applies.
    const inspection = ports.inspection();
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool: ports.activeTool(),
      brushCorners: ports.getBrushRect(),
      hasInspection: inspection.inspection !== null,
      pinEnabled: context.inspectConfig()?.pin === true,
      focusKey: inspection.inspection?.focus.key ?? null,
      sourceKeys: inspection.inspection?.focus.sourceKeys ?? [],
      inspectionAnchor: inspection.inspection?.focus.anchor ?? null,
      inspectionPanel: inspection.inspectionPanel,
      // Viewport is the sole panel authority — not scene.panels[0] (#1038).
      firstPanel: (() => {
        const panel = context.model()?.viewport.panels[0];
        return panel === undefined ? undefined : panelBoundsFrom(panel.bounds);
      })(),
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "nudge-brush": {
        // Pure table owns clamp panel policy and free-corner nudge.
        ports.setBrushRect(action.corners);
        reducerOf().dispatch({
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
        ports.setBrushRect(brushAtPoint(action.anchor));
        reducerOf().dispatch({
          type: "begin-area",
          point: action.anchor,
          panelId: originPanel.id,
        });
        context.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
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
        ports.togglePointKeys(action.keys, "keyboard");
        return;
      case "toggle-pin":
        inspection.toggleInspectionPin("keyboard");
        return;
      case "escape": {
        const plan = inspection.dismissInspection("escape", "keyboard", {
          returnToInspect: action.returnToInspect,
        });
        applyInspectionDismissSideEffects(plan, {
          clearBrush: () => {
            ports.setBrushRect(null);
          },
          chooseTool: ports.chooseTool,
        });
        break;
      }
      case "none":
        break;
    }
  }

  function onCaptureClick(event: MouseEvent): void {
    const inspection = ports.inspection();
    const action = resolveCaptureClickAction({
      suppressClick: performance.now() < suppressClickUntil,
      activeTool: ports.activeTool(),
      pointSelectEnabled: ports.pointSelectEnabled(),
      inspectEnabled: context.inspectConfig() !== null,
      pinEnabled: context.inspectConfig()?.pin === true,
      hasInspection: inspection.inspection !== null,
    });
    switch (action.type) {
      case "suppress":
        suppressClickUntil = 0;
        break;
      case "toggle-point": {
        const point = plotPoint(event);
        // Resolved target owns panel-scoped nearest + point-select radius (#1080 / #787).
        const model = context.model();
        const target =
          model === null
            ? null
            : resolveTarget({
                model,
                point,
                intent: "point-select",
                inspect: null,
              });
        if (target === null) break;
        ports.togglePointKeys(context.candidateSemanticKeys(target.match), "pointer");
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
    ports.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    clearTouchInspect();
    reducerOf().cancelScheduledPointer();
    ports.setBrushRect(null);
    reducerOf().dispatch({ type: "cancel-area" });
  }

  /**
   * Lost capture: pure table owns keep vs clear draft; host mutates brushRect.
   */
  function onLostPointerCapture(): void {
    const lost = resolveLostPointerCaptureAction(reducerOf().state.area.kind);
    switch (lost.type) {
      case "ignore":
        break;
      case "cancel-keep-draft":
        reducerOf().dispatch({ type: "cancel-area" });
        break;
      case "cancel-clear-draft":
        ports.setBrushRect(null);
        reducerOf().dispatch({ type: "cancel-area" });
        break;
    }
  }

  return {
    applyAreaMove,
    clearTouchInspect,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onLostPointerCapture,
    onCaptureClick,
    onSurfaceKeyDown,
    onSurfaceBlur,
  };
}
