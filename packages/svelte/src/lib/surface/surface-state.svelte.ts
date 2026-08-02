/**
 * Surface controller extracted from GGPlot for S7.
 *
 * Owns the interaction reducer (+ revision), tool/brush state, construction-
 * time deriveds (activeTool, surfaceDescription, brushing, areaAwaitingSecond),
 * pointer/keyboard/capture handler switches, and both surface effects
 * (window-teardown then tool-sync).
 *
 * Construction topology (assembly): surface is constructed BEFORE inspection
 * so the shared reducer exists as a concrete instance; inspection receives it
 * via options. Construction-time deriveds read ONLY module-internal state +
 * context.inspectConfig. Sibling controller ports, sinks, and chrome getters
 * are handler/effect-only (armed for the construction guard).
 *
 * Window-teardown + tool-sync effects register inside this factory (#627).
 * Tool-scoped pure decision tables stay in pointer.ts, keyboard.ts, and
 * area-brush.ts — those seams narrow traffic; this module is the single owner.
 */
import type { InspectionState } from "../inspection/inspection-state.svelte.js";
import type { InteractionContext } from "../interaction/interaction-context.svelte.js";
import type { IntervalState } from "../interval/interval-state.svelte.js";
import type {
  InteractionSource,
  InteractionTool,
  IntervalSelection,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import { resolveTarget } from "../interaction/target.js";
import { resolveChooseToolAction, resolveEffectiveTool } from "../interaction/capability.js";
import {
  resolveSurfaceBlurAction,
  shouldClosePinnedOnOutsidePointer,
} from "../inspection/teardown.js";
import { applyInspectionDismissSideEffects } from "../interaction/transition-owner.js";
import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  type IntervalQueryScene,
} from "../interval/query.js";
import { BRUSH_SECOND_CORNER_ANNOUNCEMENT } from "../assembly/labels.js";
import { normalizedRect, panelBoundsFrom } from "../scene/geometry.js";
import { brushAtPoint, brushWithEnd } from "./area-brush.js";
import type { FinishBrushAction } from "./brush-finish.js";
import { resolveSurfaceKeyAction } from "./keyboard.js";
import {
  advanceTouchInspectMoved,
  isAreaAwaitingSecond,
  isAreaBrushing,
  resolveCaptureClickAction,
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerMoveAction,
  resolvePointerUpAction,
  shouldClearInspectionOnPointerLeave,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
} from "./pointer.js";
import { buildSurfaceDescription } from "./surface-description.js";
import type { PlotZoomState } from "../zoom/zoom-state.svelte.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Component-held reducer shape — factory creates it inside the module. */
type InteractionReducer = ReturnType<typeof createInteractionReducer>;

type BrushRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/**
 * Surface-specific ports beyond the shared InteractionContext. Sibling
 * controllers are wired by the assembly (interaction-states.svelte.ts) as
 * handler-only getters over the bundle under construction.
 */
export type SurfaceStateOptions = {
  /** Controlled-tool prop + resolved config/chrome (host-held). */
  readonly toolProp: () => InteractionTool | undefined;
  readonly initialTool: () => ResolvedInteractionConfig["initialTool"];
  readonly availableTools: () => readonly InteractionTool[];
  /**
   * Host point-select enablement (`select?.type === "point"`). Host-derived
   * before this factory so surface does not close over later chromeState
   * (#1082). Same formula as chrome `canPublishPointSelection`.
   */
  readonly pointSelectEnabled: () => boolean;
  /**
   * Required by the window-teardown effect — NOT derivable from filtered
   * availableTools (codex P1-4).
   */
  readonly surfaceInteractive: () => boolean;
  /** Sibling controller ports (handler-only reads). */
  readonly inspection: () => Pick<
    InspectionState,
    | "inspection"
    | "inspectionPanel"
    | "schedulePointerInspect"
    | "cancelPointerInspect"
    | "onInspectPointerFrame"
    | "setInspection"
    | "closeInspection"
    | "dismissInspection"
    | "toggleInspectionPin"
    | "navigateDirection"
    | "cycleCoincident"
    | "resetTraversalIndex"
  >;
  readonly interval: () => Pick<IntervalState, "finishBrushSelect" | "committedInterval">;
  readonly zoom: () => Pick<PlotZoomState, "applyBrushZoom">;
  /** Selection controller write paths. */
  readonly emitSelection: (event: PlotSelection) => void;
  readonly togglePointKeys: (keys: readonly PropertyKey[], source: InteractionSource) => void;
};

export type SurfaceState = {
  readonly reducer: InteractionReducer;
  readonly activeTool: InteractionTool;
  readonly surfaceDescription: string;
  readonly brushRect: BrushRect | null;
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
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the surface controller. Construction registers deriveds and
 * window-teardown + tool-sync effects.
 *
 * Construction-order note: deps must not be invoked during construction —
 * construction-read discipline enforced by the armed-getter suite.
 */
export function createSurfaceState(
  context: InteractionContext,
  options: SurfaceStateOptions,
): SurfaceState {
  let reducerRevision = $state(0);
  let brushRect = $state<BrushRect | null>(null);
  let queuedAreaSource: InteractionSource = "pointer";
  let touchInspectStart: { x: number; y: number } | null = null;
  let touchInspectMoved = false;
  let suppressClickUntil = 0;

  // Reducer is created INSIDE the factory (original host position ~516).
  // applyAreaMove is a function declaration (hoisted) so the rAF frame
  // callback can call it without a late-bound handlers object.
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
        applyAreaMove(action.point);
        return true;
      }
      return options.inspection().onInspectPointerFrame(action);
    },
  });

  // Construction-safe: own state + inspectConfig only.
  const activeTool = $derived.by(() => {
    void reducerRevision;
    return reducer.state.tool;
  });
  // Lazy pin read: only consult inspectConfig on the inspect tool branch so
  // non-inspect tools do not subscribe to inspect config (dependency tracking).
  const surfaceDescription = $derived.by(() =>
    buildSurfaceDescription(
      activeTool,
      activeTool === "inspect" && context.inspectConfig()?.pin === true,
    ),
  );

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

  function clearTouchInspectStart(): void {
    touchInspectStart = null;
  }

  function chooseTool(next: InteractionTool): void {
    // Decision table is pure (interaction/capability); this switch owns side effects.
    const action = resolveChooseToolAction({
      next,
      available: options.availableTools(),
      isControlled: options.toolProp() !== undefined,
    });
    switch (action.type) {
      case "ignore":
        return;
      case "request":
        context.ontoolchange()?.(next);
        return;
      case "apply":
        reducer.dispatch({ type: "set-tool", tool: next });
        brushRect = null;
        // set-tool already full-cancels the schedule; clear inspect payload only
        // (preserve pinned stash — matches prior clearQueuedPointer-only path).
        options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
        context.ontoolchange()?.(next);
        break;
    }
  }

  function plotPoint(event: PointerEvent | MouseEvent): {
    x: number;
    y: number;
  } {
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
      activeTool,
      touchInspectMoved,
      hasTouchInspectStart: touchInspectStart !== null,
      brushing,
      hasBrushDraft: brushRect !== null,
      inspect: context.inspectConfig(),
    });
    switch (action.type) {
      case "touch-inspect-drag-cancel":
        options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
        return;
      case "queue-area-move":
        queuedAreaSource = action.source;
        reducer.queuePointer({ type: "move-area", point: p });
        return;
      case "queue-inspect":
        // mode/maxDistance from pure snapshot — no inspect config re-gate.
        // Inspection owns nearest lookup, token, and reducer.queuePointer.
        options.inspection().schedulePointerInspect({
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
    const draft = brushRect;
    if (!brushing || draft === null) return;
    const next = brushWithEnd(draft, point);
    brushRect = next;
    if (activeTool === "select-area")
      options.emitSelection(selectionEvent("change", normalizedRect(next), source));
  }

  /** Map the live render model into the pure interval query scene adapter. */
  function intervalQueryScene(): IntervalQueryScene | null {
    const model = context.model();
    if (model === null) return null;
    return intervalQuerySceneFromModel(model);
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
        context.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        break;
      case "select-end": {
        brushRect = null;
        const eventValue = selectionEvent("end", finish.rect, source);
        // Interval owns commit + emit; surface only routes FinishBrushAction.
        options.interval().finishBrushSelect(eventValue, source);
        reducer.dispatch({ type: "cancel-area" });
        break;
      }
      case "zoom-end":
        brushRect = null;
        options.zoom().applyBrushZoom(finish.rect, source);
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
          tooltipHovered: context.tooltipHovered(),
        })
      )
        return;
      options.inspection().cancelPointerInspect({ pendingPinned: "discard" });
      reducer.cancelScheduledPointer();
      options.inspection().setInspection(null, "pointer");
    });
  }

  function onPointerDown(event: PointerEvent): void {
    // Always cancel queued inspection before pure routing (host cleanup).
    // Preserve pinned stash; full schedule cancel (inspect + move-area).
    options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
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
        const model = context.model();
        const originPanel = extending
          ? area.kind === "idle" || area.panelId === null
            ? null
            : (model?.viewport.panel(area.panelId) ?? null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        // Pure table owns fresh vs extend corner policy.
        brushRect = action.corners;
        options.inspection().setInspection(null, action.source);
        reducer.dispatch({
          type: "begin-area",
          point: p,
          panelId: originPanel.id,
        });
        if (action.emitSelectStart) {
          const startEvent = selectionEvent("start", normalizedRect(action.corners), action.source);
          options.emitSelection(startEvent);
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
        ? options.interval().committedInterval?.panelId
        : reducer.state.area.panelId;
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
      activeTool,
      inspect: context.inspectConfig(),
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
          options.inspection().setInspection(target.match, "touch", action.state, target.mode);
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
      relatedTargetInsideRoot:
        context.root()?.contains(event.relatedTarget as Node | null) === true,
      inspectionState: options.inspection().inspection?.state ?? "none",
    });
    if (blurAction.type === "ignore") return;
    // Shared for keep-pinned and clear-inspection (ordering is load-bearing).
    options.inspection().resetTraversalIndex();
    options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
    if (blurAction.type === "blur-clear-inspection")
      options.inspection().setInspection(null, "keyboard");
  }

  function onSurfaceKeyDown(event: KeyboardEvent): void {
    // Decision table is pure (surface/keyboard); this switch owns side
    // effects only. brushCorners is the draft source of truth (not reducer
    // brushing); nudge/complete-area carry pure payloads so host only applies.
    const inspection = options.inspection();
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool,
      brushCorners: brushRect,
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
        options.togglePointKeys(action.keys, "keyboard");
        return;
      case "toggle-pin":
        inspection.toggleInspectionPin("keyboard");
        return;
      case "escape": {
        const plan = inspection.dismissInspection("escape", "keyboard", {
          returnToInspect: action.returnToInspect,
        });
        applyInspectionDismissSideEffects(plan, {
          clearBrush,
          chooseTool,
        });
        break;
      }
      case "none":
        break;
    }
  }

  function onCaptureClick(event: MouseEvent): void {
    const inspection = options.inspection();
    const action = resolveCaptureClickAction({
      suppressClick: performance.now() < suppressClickUntil,
      activeTool,
      pointSelectEnabled: options.pointSelectEnabled(),
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
        options.togglePointKeys(context.candidateSemanticKeys(target.match), "pointer");
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
    options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
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

  // Window outside-pointer / blur teardown + tool-sync (formerly host-phased
  // registerSurfaceEffects — registered at construction, #627).
  $effect(() => {
    // No-op cleanup keeps every code path returning a teardown (consistent-return).
    if (!options.surfaceInteractive()) return () => {};
    const onOutsidePointer = (event: PointerEvent) => {
      if (
        !shouldClosePinnedOnOutsidePointer({
          inspectionState: options.inspection().inspection?.state,
          targetInsideRoot: context.root()?.contains(event.target as Node) === true,
        })
      )
        return;
      options.inspection().closeInspection("pointer", false);
    };
    const cancelDraft = () => {
      brushRect = null;
      options.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
      clearTouchInspectStart();
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

  $effect(() => {
    const next = resolveEffectiveTool(
      options.toolProp() ?? options.initialTool(),
      options.availableTools(),
    );
    reducer.dispatch({ type: "set-tool", tool: next });
  });

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
  };
}
