/**
 * createSurfaceState construction, tool cycle, effects, callback liveness.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { hitFromCandidate } from "../../src/lib/surface/plot-px.js";
import { withEffectRoot } from "../helpers/effect-root.svelte.js";
import {
  continuousSpec,
  firstCandidate,
  mountSurfaceComposite,
  createSurfaceState,
  normalizeInteractionConfig,
  modelFor,
  fromAny,
  panelCenterClient,
  pointerEvent,
  type SurfaceStateDeps,
  type InteractionTool,
} from "./surface-state.harness.js";

describe("createSurfaceState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    const model = modelFor(continuousSpec());
    const config = normalizeInteractionConfig({
      inspect: { pin: true },
      select: { type: "interval" },
      zoom: true,
    });

    let inspectionCalls = 0;
    let intervalCalls = 0;
    let zoomCalls = 0;
    let emitSelectionCalls = 0;
    let semanticKeyCalls = 0;
    let candidateSemanticKeysCalls = 0;
    let togglePointKeysCalls = 0;
    let pointSelectEnabledCalls = 0;
    let ontoolchangeCalls = 0;
    let availableToolsCalls = 0;
    let toolPropCalls = 0;
    let tooltipHoveredCalls = 0;
    let coordFlippedCalls = 0;
    let surfaceInteractiveCalls = 0;

    // Minimal stubs so construction can close the cycle without real siblings.
    const stubInspection = fromAny<
      SurfaceStateDeps["inspection"] extends () => infer R ? R : never
    >({
      get inspection() {
        inspectionCalls++;
        return null;
      },
      get inspectionPanel() {
        inspectionCalls++;
        return null;
      },
      applyQueuedInspectFrame: () => {
        inspectionCalls++;
      },
      queuePointerFrame: () => {
        inspectionCalls++;
      },
      clearQueuedPointer: () => {
        inspectionCalls++;
      },
      clearPendingPinned: () => {
        inspectionCalls++;
      },
      setInspection: () => {
        inspectionCalls++;
      },
      closeInspection: () => {
        inspectionCalls++;
      },
      dismissInspection: () => {
        inspectionCalls++;
      },
      toggleInspectionPin: () => {
        inspectionCalls++;
      },
      navigateDirection: () => {
        inspectionCalls++;
      },
      cycleCoincident: () => {
        inspectionCalls++;
      },
      resetTraversalIndex: () => {
        inspectionCalls++;
      },
    });

    const stubInterval = fromAny<SurfaceStateDeps["interval"] extends () => infer R ? R : never>({
      get committedInterval() {
        intervalCalls++;
        return null;
      },
      applyBrushSelectEnd: () => {
        intervalCalls++;
      },
    });

    const stubZoom = fromAny<SurfaceStateDeps["zoom"] extends () => infer R ? R : never>({
      applyBrushZoom: () => {
        zoomCalls++;
      },
    });

    const { value: state, destroy } = withEffectRoot(() =>
      createSurfaceState({
        model: () => model,
        coordFlipped: () => {
          coordFlippedCalls++;
          return false;
        },
        root: () => null,
        toolProp: () => {
          toolPropCalls++;
        },
        initialTool: () => config.initialTool,
        availableTools: () => {
          availableToolsCalls++;
          return config.availableTools;
        },
        inspectConfig: () => config.inspect,
        selectConfig: () => config.select,
        pointSelectEnabled: () => {
          pointSelectEnabledCalls++;
          return false;
        },
        ontoolchange: () => {
          ontoolchangeCalls++;
        },
        surfaceInteractive: () => {
          surfaceInteractiveCalls++;
          return true;
        },
        candidateSemanticKeys: () => {
          candidateSemanticKeysCalls++;
          return [];
        },
        inspection: () => {
          inspectionCalls++;
          return stubInspection;
        },
        interval: () => {
          intervalCalls++;
          return stubInterval;
        },
        zoom: () => {
          zoomCalls++;
          return stubZoom;
        },
        emitSelection: () => {
          emitSelectionCalls++;
        },
        semanticKey: () => {
          semanticKeyCalls++;
          return null;
        },
        togglePointKeys: () => {
          togglePointKeysCalls++;
        },
        tooltipHovered: () => {
          tooltipHoveredCalls++;
          return false;
        },
        announce: () => {},
      }),
    );

    // Public accessors only (+ flush) — brushing is private.
    expect(state.reducer).toBeDefined();
    expect(state.activeTool).toBeTypeOf("string");
    expect(state.surfaceDescription).toBeTypeOf("string");
    expect(state.brushRect).toBeNull();
    expect(state.areaAwaitingSecond).toBe(false);
    flushSync();

    expect(inspectionCalls).toBe(0);
    expect(intervalCalls).toBe(0);
    expect(zoomCalls).toBe(0);
    expect(emitSelectionCalls).toBe(0);
    expect(semanticKeyCalls).toBe(0);
    expect(candidateSemanticKeysCalls).toBe(0);
    expect(togglePointKeysCalls).toBe(0);
    expect(pointSelectEnabledCalls).toBe(0);
    expect(ontoolchangeCalls).toBe(0);
    expect(availableToolsCalls).toBe(0);
    expect(toolPropCalls).toBe(0);
    expect(tooltipHoveredCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(surfaceInteractiveCalls).toBe(0);

    destroy();
  });

  it("surfaceDescription reads inspectConfig only while the inspect tool is active", () => {
    // Characterizes lazy pin-gate dependency tracking: non-inspect tools must
    // not subscribe to inspectConfig when description is re-derived.
    const model = modelFor(continuousSpec());
    const config = normalizeInteractionConfig({
      inspect: { pin: true },
      select: { type: "interval" },
      zoom: true,
    });
    let inspectConfigCalls = 0;
    const stubInspection = fromAny<
      SurfaceStateDeps["inspection"] extends () => infer R ? R : never
    >({
      get inspection() {
        return null;
      },
      clearQueuedPointer: () => {},
      clearPendingPinned: () => {},
      setInspection: () => {},
      applyQueuedInspectFrame: () => {},
      queuePointerFrame: () => {},
      closeInspection: () => {},
      dismissInspection: () => {},
      toggleInspectionPin: () => {},
      navigateDirection: () => {},
      cycleCoincident: () => {},
      resetTraversalIndex: () => {},
      get inspectionPanel() {
        return null;
      },
    });
    const stubInterval = fromAny<SurfaceStateDeps["interval"] extends () => infer R ? R : never>({
      applyBrushSelectEnd: () => {},
      get committedInterval() {
        return null;
      },
    });
    const stubZoom = fromAny<SurfaceStateDeps["zoom"] extends () => infer R ? R : never>({
      applyBrushZoom: () => {},
    });

    const { value: state, destroy } = withEffectRoot(() =>
      createSurfaceState({
        model: () => model,
        coordFlipped: () => false,
        root: () => null,
        toolProp: () => {
          /* uncontrolled */
        },
        initialTool: () => config.initialTool,
        availableTools: () => config.availableTools,
        inspectConfig: () => {
          inspectConfigCalls++;
          return config.inspect;
        },
        selectConfig: () => config.select,
        pointSelectEnabled: () => false,
        ontoolchange: () => {
          /* no controlled callback */
        },
        surfaceInteractive: () => true,
        candidateSemanticKeys: () => [],
        inspection: () => stubInspection,
        interval: () => stubInterval,
        zoom: () => stubZoom,
        emitSelection: () => {},
        semanticKey: () => null,
        togglePointKeys: () => {},
        tooltipHovered: () => false,
        announce: () => {},
      }),
    );

    flushSync();
    inspectConfigCalls = 0;
    expect(state.activeTool).toBe("inspect");
    void state.surfaceDescription;
    expect(inspectConfigCalls).toBeGreaterThan(0);

    state.chooseTool("select-area");
    flushSync();
    inspectConfigCalls = 0;
    void state.surfaceDescription;
    expect(inspectConfigCalls).toBe(0);
    expect(state.surfaceDescription).toContain("selection corner");

    destroy();
  });
});

describe("createSurfaceState tool cycle", () => {
  it("uncontrolled chooseTool applies set-tool, clears draft/queue, fires ontoolchange", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    // Start on inspect (initial), then switch to select-area.
    expect(h.surface.activeTool).toBe("inspect");

    h.surface.chooseTool("select-area");
    flushSync();
    expect(h.surface.activeTool).toBe("select-area");
    expect(h.toolChanges).toEqual(["select-area"]);
    expect(h.surface.brushRect).toBeNull();

    h.destroy();
  });

  it("controlled toolProp only requests via ontoolchange (no state change)", () => {
    const h = mountSurfaceComposite({
      toolProp: "inspect",
      registerEffects: false,
    });
    expect(h.surface.activeTool).toBe("inspect");
    h.surface.chooseTool("select-area");
    flushSync();
    expect(h.surface.activeTool).toBe("inspect");
    expect(h.toolChanges).toEqual(["select-area"]);
    h.destroy();
  });

  it("ignores chooseTool for tools not in availableTools", () => {
    // Default harness enables inspect + interval + zoom — not point selection.
    const h = mountSurfaceComposite({ registerEffects: false });
    expect(h.surface.activeTool).toBe("inspect");
    h.surface.chooseTool("point");
    flushSync();
    expect(h.surface.activeTool).toBe("inspect");
    expect(h.toolChanges).toEqual([]);
    h.destroy();
  });

  it("tool-sync effect resolves initial tool into the reducer", () => {
    const config = normalizeInteractionConfig({
      inspect: { pin: true },
      select: { type: "interval" },
      tool: "select-area",
    });
    const h = mountSurfaceComposite({
      interactionConfig: config,
      registerEffects: true,
    });
    flushSync();
    expect(h.surface.activeTool).toBe("select-area");
    h.destroy();
  });
});

describe("createSurfaceState outside-pointer effect", () => {
  it("pinned + outside pointerdown closes; inside does not; window blur cancels draft", () => {
    const h = mountSurfaceComposite({ registerEffects: true });
    const candidate = firstCandidate(h.model);
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "pointer",
      "transient",
      "xy",
      candidate,
    );
    flushSync();
    h.inspection.toggleInspectionPin("pointer");
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");

    // Inside root → no close
    h.root.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 1, clientY: 1 }),
    );
    // The listener is on window; synthesize with target inside root.
    const insideEvt = new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 5,
      clientY: 5,
    });
    Object.defineProperty(insideEvt, "target", { value: h.capture });
    window.dispatchEvent(insideEvt);
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");

    // Outside root → close
    const outside = document.createElement("div");
    document.body.append(outside);
    const outsideEvt = new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 1,
      clientY: 1,
    });
    Object.defineProperty(outsideEvt, "target", { value: outside });
    window.dispatchEvent(outsideEvt);
    flushSync();
    expect(h.inspection.inspection).toBeNull();
    outside.remove();

    // Window blur cancels brush draft
    h.surface.chooseTool("select-area");
    flushSync();
    const start = panelCenterClient(h.model);
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    window.dispatchEvent(new Event("blur"));
    flushSync();
    expect(h.surface.brushRect).toBeNull();

    h.destroy();
  });
});

describe("createSurfaceState callback replacement", () => {
  it("honors ontoolchange box swap", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const later: InteractionTool[] = [];
    h.setOnToolChange((tool) => {
      later.push(tool);
    });
    h.surface.chooseTool("select-area");
    flushSync();
    expect(later).toEqual(["select-area"]);
    // Original harness array must not receive the swapped callback's events.
    expect(h.toolChanges).toEqual([]);
    h.destroy();
  });
});
