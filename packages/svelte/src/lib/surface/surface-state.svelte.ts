/**
 * Surface controller extracted from GGPlot for S7.
 *
 * Owns the interaction reducer (+ revision), tool/brush state,
 * construction-time deriveds (activeTool, surfaceDescription, brushing,
 * areaAwaitingSecond), tool selection, and both surface effects
 * (window-teardown then tool-sync). The DOM/event handler implementation
 * lives in surface-handlers.svelte.ts and receives live accessors/actions
 * from this factory (reducer thunk, derived reads, brush-draft get/set,
 * sibling controller ports).
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
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import { resolveChooseToolAction, resolveEffectiveTool } from "../interaction/capability.js";
import { shouldClosePinnedOnOutsidePointer } from "../inspection/teardown.js";
import { buildSurfaceDescription } from "./surface-description.js";
import { isAreaAwaitingSecond, isAreaBrushing } from "./pointer.js";
import type { PlotZoomState } from "../zoom/zoom-state.svelte.js";
import { createSurfaceHandlers } from "./surface-handlers.svelte.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Component-held reducer shape — factory creates it inside the module. */
export type InteractionReducer = ReturnType<typeof createInteractionReducer>;

export type BrushRect = {
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

  // Handlers are created first and receive the reducer via a thunk — the
  // reducer's onPointerFrame calls back into handlers.applyAreaMove (the
  // module boundary replaces the original hoisted function declaration).
  const handlers = createSurfaceHandlers({
    context,
    reducer: () => reducer,
    activeTool: () => activeTool,
    brushing: () => brushing,
    areaAwaitingSecond: () => areaAwaitingSecond,
    getBrushRect: () => brushRect,
    setBrushRect: (rect) => {
      brushRect = rect;
    },
    chooseTool,
    inspection: options.inspection,
    interval: options.interval,
    zoom: options.zoom,
    emitSelection: options.emitSelection,
    togglePointKeys: options.togglePointKeys,
    pointSelectEnabled: options.pointSelectEnabled,
  });

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
        handlers.applyAreaMove(action.point);
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
      handlers.clearTouchInspect();
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
    onPointerMove: handlers.onPointerMove,
    onPointerDown: handlers.onPointerDown,
    onPointerUp: handlers.onPointerUp,
    onPointerLeave: handlers.onPointerLeave,
    onPointerCancel: handlers.onPointerCancel,
    onLostPointerCapture: handlers.onLostPointerCapture,
    onCaptureClick: handlers.onCaptureClick,
    onSurfaceKeyDown: handlers.onSurfaceKeyDown,
    onSurfaceBlur: handlers.onSurfaceBlur,
  };
}
