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
 * Cross-module transitions route through InteractionTransitionPort; the
 * transition owner registers phased effects via onRegisterEffects.
 */
import type { RenderModel } from "@ggsvelte/core";

import type { InteractionTool, ResolvedInteractionConfig } from "../interaction/interaction.js";
import { createInteractionReducer } from "../interaction/reducer.js";
import type { InteractionTransitionPort } from "../interaction/transition-port.js";
import { resolveEffectiveTool } from "../interaction/capability.js";
import { shouldClosePinnedOnOutsidePointer } from "../inspection/teardown.js";
import { isAreaAwaitingSecond, isAreaBrushing } from "./pointer.js";
import { buildSurfaceDescription } from "./surface-description.js";
import { createSurfaceHandlers, type BrushRect } from "./surface-handlers.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Component-held reducer shape — factory creates it inside the module. */
type InteractionReducer = ReturnType<typeof createInteractionReducer>;

export type SurfaceStateDeps = {
  model: () => RenderModel | null;
  root: () => HTMLDivElement | null;
  /** Authoritative cross-module transition seam (owner-populated). */
  port: InteractionTransitionPort;
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
  tooltipHovered: () => boolean;
  announce: (message: string) => void;
  /** Owner-only: collect phased effect registration for deterministic ordering. */
  onRegisterEffects?: (attach: () => void) => void;
};

export type SurfaceState = {
  readonly reducer: InteractionReducer;
  readonly activeTool: InteractionTool;
  readonly surfaceDescription: string;
  readonly brushRect: BrushRect | null;
  readonly areaAwaitingSecond: boolean;
  clearBrush(): void;
  chooseTool(next: InteractionTool): void;
  clearTouchInspectStart(): void;
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
 * Create the surface controller. Construction registers only the
 * construction-time deriveds. The transition owner registers effects through
 * onRegisterEffects after sibling wiring is complete.
 */
export function createSurfaceState(deps: SurfaceStateDeps): SurfaceState {
  let reducerRevision = $state(0);
  let handlers!: ReturnType<typeof createSurfaceHandlers>;

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
      return deps.port.onInspectPointerFrame(action);
    },
  });

  const activeTool = $derived.by(() => {
    void reducerRevision;
    return reducer.state.tool;
  });
  const surfaceDescription = $derived.by(() =>
    buildSurfaceDescription(
      activeTool,
      activeTool === "inspect" && deps.inspectConfig()?.pin === true,
    ),
  );

  let brushRect = $state<BrushRect | null>(null);
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

  function attachSurfaceEffects(): void {
    $effect(() => {
      if (!deps.surfaceInteractive()) return () => {};
      const onOutsidePointer = (event: PointerEvent) => {
        if (
          !shouldClosePinnedOnOutsidePointer({
            inspectionState: deps.port.inspection?.state,
            targetInsideRoot: deps.root()?.contains(event.target as Node) === true,
          })
        )
          return;
        deps.port.closeInspection("pointer", false);
      };
      const cancelDraft = () => {
        brushRect = null;
        deps.port.cancelPointerInspect({ pendingPinned: "preserve" });
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

    $effect(() => {
      const next = resolveEffectiveTool(
        deps.toolProp() ?? deps.initialTool(),
        deps.availableTools(),
      );
      reducer.dispatch({ type: "set-tool", tool: next });
    });
  }

  deps.onRegisterEffects?.(attachSurfaceEffects);

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
    clearTouchInspectStart: () => {
      handlers.clearTouchInspectStart();
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
  };
}
