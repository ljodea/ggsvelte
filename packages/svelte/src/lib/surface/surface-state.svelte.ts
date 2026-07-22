/**
 * Surface controller extracted from GGPlot for S7.
 *
 * Owns the interaction reducer (+ revision), tool/brush state, construction-
 * time deriveds (activeTool, surfaceDescription, brushing, areaAwaitingSecond),
 * and both surface effects (window-teardown then tool-sync).
 *
 * Pointer/keyboard/capture handler switches live in surface-handlers.ts and
 * receive live bindings so rAF frames and leave-microtasks never snapshot
 * stale tool/brush state.
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

import type { InspectionState } from "../inspection/inspection-state.svelte.js";
import type { IntervalState } from "../interval/interval-state.svelte.js";
import type {
  InteractionSource,
  InteractionTool,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import { resolveEffectiveTool } from "../interaction/capability.js";
import { shouldClosePinnedOnOutsidePointer } from "../inspection/teardown.js";
import { isAreaAwaitingSecond, isAreaBrushing } from "./pointer.js";
import { buildSurfaceDescription } from "./surface-description.js";
import type { PlotZoomState } from "../zoom/zoom-state.svelte.js";
import { createSurfaceHandlers, type BrushRect } from "./surface-handlers.js";

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
  /** Capture-click reads it — deferred closure, same #165 pattern. */
  candidateSemanticKeys: (candidate: CandidateFacts) => PropertyKey[];
  /** Sibling controllers (handler-only; inspection earlier, interval later). */
  inspection: () => Pick<
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
  // Late-bound: handlers are created after the reducer so onPointerFrame can
  // call applyAreaMove without a construction cycle.
  let handlers!: ReturnType<typeof createSurfaceHandlers>;

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
      return deps.inspection().onInspectPointerFrame(action);
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
      activeTool === "inspect" && deps.inspectConfig()?.pin === true,
    ),
  );

  let brushRect = $state<BrushRect | null>(null);
  // Private — no remaining host consumer after extraction (codex P2-7).
  const brushing = $derived.by(() => {
    void reducerRevision;
    return isAreaBrushing(reducer.state.area.kind);
  });
  const areaAwaitingSecond = $derived.by(() => {
    void reducerRevision;
    return isAreaAwaitingSecond(reducer.state.area.kind);
  });

  handlers = createSurfaceHandlers({
    deps,
    reducer,
    getActiveTool: () => activeTool,
    getBrushing: () => brushing,
    getAreaAwaitingSecond: () => areaAwaitingSecond,
    getBrushRect: () => brushRect,
    setBrushRect: (next) => {
      brushRect = next;
    },
  });

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
        deps.inspection().cancelPointerInspect({ pendingPinned: "preserve" });
        handlers.clearTouchInspectStart();
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
    clearBrush: () => {
      handlers.clearBrush();
    },
    chooseTool: (next) => {
      handlers.chooseTool(next);
    },
    onPointerMove: (event) => {
      handlers.onPointerMove(event);
    },
    onPointerDown: (event) => {
      handlers.onPointerDown(event);
    },
    onPointerUp: (event) => {
      handlers.onPointerUp(event);
    },
    onPointerLeave: () => {
      handlers.onPointerLeave();
    },
    onPointerCancel: () => {
      handlers.onPointerCancel();
    },
    onLostPointerCapture: () => {
      handlers.onLostPointerCapture();
    },
    onCaptureClick: (event) => {
      handlers.onCaptureClick(event);
    },
    onSurfaceKeyDown: (event) => {
      handlers.onSurfaceKeyDown(event);
    },
    onSurfaceBlur: (event) => {
      handlers.onSurfaceBlur(event);
    },
    registerSurfaceEffects,
  };
}
