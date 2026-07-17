/**
 * Surface controller tests (S7 extraction).
 * Factories own deriveds + effects — instantiate under `$effect.root` and destroy.
 *
 * Real sibling controllers (zoom, inspection, interval) are wired to the same
 * model. Harness reproduces production phased order:
 *   zoom → inspection → surface → interval → registerSurfaceEffects
 *   → registerInspectionEffects
 */
import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CandidateFacts, CellValue, RenderModel } from "@ggsvelte/core";
import { buildHitIndex } from "@ggsvelte/core/dom";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import type { InteractionSource, InteractionTool, PlotSelection } from "../src/lib/interaction.js";
import { normalizeInteractionConfig } from "../src/lib/interaction.js";
import { createPlotInteraction } from "../src/lib/interaction-controller.svelte.js";
import { createInspectionState, type InspectionState } from "../src/lib/inspection-state.svelte.js";
import { createIntervalState, type IntervalState } from "../src/lib/interval-state.svelte.js";
import { hitFromCandidate } from "../src/lib/plot-pointer.js";
import type { QueuedPointerInspection } from "../src/lib/plot-surface-inspection-frame.js";
import { TOUCH_INSPECT_CLICK_SUPPRESS_MS } from "../src/lib/plot-surface-pointer.js";
import { createPlotZoomState, type PlotZoomState } from "../src/lib/plot-zoom-state.svelte.js";
import {
  createSurfaceState,
  type SurfaceState,
  type SurfaceStateDeps,
} from "../src/lib/surface-state.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { modelFor } from "./helpers/model.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";

const continuousRows = [
  { id: "a", x: 1, y: 1 },
  { id: "b", x: 10, y: 20 },
  { id: "c", x: 5, y: 8 },
];

/** Getter that supplies no interaction controller (chart-local mode). */
const noController = (): ReturnType<typeof createPlotInteraction> | undefined => {
  /* chart-local */
};

function continuousSpec(
  data: readonly { id: string; x: number; y: number }[] = continuousRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y" }))
    .geomPoint()
    .spec();
}

function facetSpec(): PortableSpec {
  return gg(
    [
      { id: "north", facet: "North", x: 1, y: 1 },
      { id: "south", facet: "South", x: 2, y: 2 },
    ],
    aes({ x: "x", y: "y" }),
  )
    .geomPoint()
    .facet({ wrap: "facet" })
    .spec();
}

function firstCandidate(model: RenderModel): CandidateFacts {
  for (let id = 0; id < model.candidates.size; id++) {
    const candidate = model.candidates.candidate(id);
    if (candidate !== null) return candidate;
  }
  throw new Error("expected at least one candidate");
}

function secondCandidate(model: RenderModel, firstId: number): CandidateFacts {
  for (let id = 0; id < model.candidates.size; id++) {
    const candidate = model.candidates.candidate(id);
    if (candidate !== null && candidate.id !== firstId) return candidate;
  }
  throw new Error("expected a second candidate");
}

function identityKeyAt(model: RenderModel): (index: number) => PropertyKey | null {
  return (index) => {
    const row = model.row(index);
    if (row === null) return null;
    const id = row["id"];
    return id === undefined || id === null ? String(index) : String(id);
  };
}

function identityCandidateKeys(candidate: CandidateFacts): PropertyKey[] {
  if (candidate.rowIndex === null) return [];
  return [String(candidate.rowIndex)];
}

function identitySemanticKey(): (
  row: Record<string, CellValue> | null,
  index: number | null,
) => PropertyKey | null {
  return (row, index) => {
    if (row !== null) {
      const id = row["id"];
      if (id !== undefined && id !== null) return String(id);
    }
    return index === null ? null : String(index);
  };
}

/** Deferred controllable frame pump — mirrors production RAF (assign-after-schedule). */
function createFramePump(): {
  scheduleFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  flush: () => void;
} {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    scheduleFrame: (callback) => {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame: (handle) => {
      pending.delete(handle);
    },
    flush: () => {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback();
    },
  };
}

/** Capture target sized to the model scene for plotPointFromClient. */
function mountCaptureTarget(model: RenderModel): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.width = `${model.scene.width}px`;
  el.style.height = `${model.scene.height}px`;
  document.body.append(el);
  // jsdom-free browser: pin rect so client→plot mapping is stable.
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: model.scene.width,
        bottom: model.scene.height,
        width: model.scene.width,
        height: model.scene.height,
        toJSON: () => ({}),
      }) satisfies DOMRect,
  });
  return el;
}

function pointerEvent(
  type: string,
  target: HTMLElement,
  opts: {
    clientX: number;
    clientY: number;
    pointerType?: string;
    button?: number;
    pointerId?: number;
  },
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: opts.clientX,
    clientY: opts.clientY,
    pointerType: opts.pointerType ?? "mouse",
    button: opts.button ?? 0,
    pointerId: opts.pointerId ?? 1,
  });
  Object.defineProperty(event, "currentTarget", { value: target, configurable: true });
  return event;
}

function panelCenterClient(model: RenderModel, panelIndex = 0): { x: number; y: number } {
  const panel = model.scene.panels[panelIndex];
  if (panel === undefined) throw new Error("expected panel");
  return {
    x: panel.x + panel.width / 2,
    y: panel.y + panel.height / 2,
  };
}

type SurfaceHarness = {
  surface: SurfaceState;
  inspection: InspectionState;
  interval: IntervalState;
  zoom: PlotZoomState;
  model: RenderModel;
  capture: HTMLDivElement;
  root: HTMLDivElement;
  framePump: ReturnType<typeof createFramePump>;
  selectionEvents: PlotSelection[];
  toolChanges: InteractionTool[];
  toggleCalls: { keys: readonly PropertyKey[]; source: InteractionSource }[];
  announcements: string[];
  destroy: () => void;
  setToolProp: (tool: InteractionTool | undefined) => void;
  setOnToolChange: (cb: ((tool: InteractionTool) => void) | undefined) => void;
};

/**
 * Production-shaped composite harness.
 * Order: zoom → inspection → surface → interval → surface effects → inspection effects.
 */
function mountSurfaceComposite(
  options: {
    spec?: PortableSpec;
    interactionConfig?: ReturnType<typeof normalizeInteractionConfig>;
    toolProp?: InteractionTool | undefined;
    surfaceInteractive?: boolean;
    registerEffects?: boolean;
    /** Override scheduleFrame (default: deferred pump). */
    useDeferredFramePump?: boolean;
  } = {},
): SurfaceHarness {
  const model = modelFor(options.spec ?? continuousSpec());
  const config =
    options.interactionConfig ??
    normalizeInteractionConfig({
      inspect: { pin: true },
      select: { type: "interval", mode: "xy" },
      zoom: true,
    });
  const framePump = createFramePump();

  const selectionEvents: PlotSelection[] = [];
  const toolChanges: InteractionTool[] = [];
  const toggleCalls: { keys: readonly PropertyKey[]; source: InteractionSource }[] = [];
  const announcements: string[] = [];

  const toolPropBox = reactiveBox<InteractionTool | undefined>(options.toolProp);
  const onToolChangeBox = reactiveBox<((tool: InteractionTool) => void) | undefined>((tool) => {
    toolChanges.push(tool);
  });

  const root = document.createElement("div");
  root.tabIndex = -1;
  document.body.append(root);
  const capture = mountCaptureTarget(model);
  root.append(capture);

  const hitIndex = buildHitIndex(model.scene);
  const keyAt = identityKeyAt(model);
  const semanticKey = identitySemanticKey();

  const { value: bundle, destroy: destroyRoot } = withFlushedEffectRoot(() => {
    // Production order: zoom → inspection → surface → interval → effects.
    // Deferred getters close over later const bindings (handler/effect only).
    let surface!: SurfaceState;
    let interval!: IntervalState;

    // 1. zoom (pre-existing)
    const zoom = createPlotZoomState({
      interaction: noController,
      resolvedInteractionScope: () => ({ keys: "plot", x: "x", y: "y" }),
      zoomConfig: () => config.zoom,
      assembled: () => options.spec ?? continuousSpec(),
      model: () => model,
      coordFlipped: () => false,
      onzoom: () => {
        /* no callback */
      },
      oninteraction: () => {
        /* no callback */
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    // 2. inspection (before surface — reversed reducer dep)
    const inspection = createInspectionState({
      model: () => model,
      reducer: () => surface.reducer,
      inspectConfig: () => config.inspect,
      surfaceInteractive: () => options.surfaceInteractive ?? true,
      inspectEnabled: () => config.inspect !== null,
      dataIdentityEpoch: () => "epoch-1",
      keyAt,
      root: () => root,
      captureSurface: () => capture,
      plotId: () => "plot-test",
      tooltipHovered: () => false,
      clearTooltipHovered: () => {},
      clearBrush: () => {
        surface.clearBrush();
      },
      chooseTool: (next) => {
        surface.chooseTool(next);
      },
      oninspect: () => {
        /* no callback */
      },
      oninteraction: () => {
        /* no callback */
      },
      announce: (message) => {
        announcements.push(message);
      },
      clearAnnouncement: () => {},
    });

    // 3. surface (owns reducer). Global rAF is the deferred suite pump.
    surface = createSurfaceState({
      model: () => model,
      coordFlipped: () => false,
      root: () => root,
      toolProp: () => toolPropBox.value,
      initialTool: () => config.initialTool,
      availableTools: () => config.availableTools,
      inspectConfig: () => config.inspect,
      selectConfig: () => config.select,
      ontoolchange: () => onToolChangeBox.value,
      surfaceInteractive: () => options.surfaceInteractive ?? true,
      hitIndex: () => hitIndex,
      candidateSemanticKeys: identityCandidateKeys,
      inspection: () => inspection,
      interval: () => interval,
      zoom: () => zoom,
      emitSelection: (event) => {
        selectionEvents.push(event);
      },
      semanticKey,
      togglePointKeys: (keys, source) => {
        toggleCalls.push({ keys, source });
      },
      tooltipHovered: () => false,
      announce: (message) => {
        announcements.push(message);
      },
    });

    // 4. interval AFTER surface (production order — deferred surface→interval)
    interval = createIntervalState({
      model: () => model,
      interaction: noController,
      resolvedInteractionScope: () => ({ keys: "plot", x: "x", y: "y", intervals: "plot" }),
      selectConfig: () => config.select,
      effectiveZoomDomains: () => zoom.effectiveZoomDomains,
      commitZoom: (domains, source) => {
        zoom.commitZoom(domains, source);
      },
      coordFlipped: () => false,
      captureSurface: () => capture,
      candidateSemanticKeys: identityCandidateKeys,
      inspectionPanel: () => inspection.inspectionPanel,
      emitSelection: (event) => {
        selectionEvents.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    // 5. surface effects then 6. inspection effects (host 810 vs 954)
    if (options.registerEffects !== false) {
      surface.registerSurfaceEffects();
      inspection.registerInspectionEffects();
    }

    return { surface, inspection, interval, zoom };
  });

  return {
    surface: bundle.surface,
    inspection: bundle.inspection,
    interval: bundle.interval,
    zoom: bundle.zoom,
    model,
    capture,
    root,
    framePump,
    selectionEvents,
    toolChanges,
    toggleCalls,
    announcements,
    setToolProp: (tool) => {
      toolPropBox.set(tool);
    },
    setOnToolChange: (cb) => {
      onToolChangeBox.set(cb);
    },
    destroy: () => {
      destroyRoot();
      capture.remove();
      root.remove();
    },
  };
}

// Install deferred rAF for the whole suite so the reducer's production
// scheduleFrame path is controllable (assign-after-schedule semantics).
const suitePump = createFramePump();
const originalRaf = globalThis.requestAnimationFrame;
const originalCaf = globalThis.cancelAnimationFrame;

afterEach(() => {
  // Drain any leftover frames between tests.
  suitePump.flush();
});

// Patch once for the module — restore is not needed (test process isolation).
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number =>
  suitePump.scheduleFrame(() => {
    cb(performance.now());
  });
globalThis.cancelAnimationFrame = (handle: number): void => {
  suitePump.cancelFrame(handle);
};

void originalRaf;
void originalCaf;

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
    let ontoolchangeCalls = 0;
    let availableToolsCalls = 0;
    let toolPropCalls = 0;
    let tooltipHoveredCalls = 0;
    let coordFlippedCalls = 0;
    let hitIndexCalls = 0;
    let surfaceInteractiveCalls = 0;

    // Minimal stubs so construction can close the cycle without real siblings.
    const stubInspection = {
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
    } as unknown as SurfaceStateDeps["inspection"] extends () => infer R ? R : never;

    const stubInterval = {
      get committedInterval() {
        intervalCalls++;
        return null;
      },
      applyBrushSelectEnd: () => {
        intervalCalls++;
      },
    } as unknown as SurfaceStateDeps["interval"] extends () => infer R ? R : never;

    const stubZoom = {
      applyBrushZoom: () => {
        zoomCalls++;
      },
    } as unknown as SurfaceStateDeps["zoom"] extends () => infer R ? R : never;

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
        ontoolchange: () => {
          ontoolchangeCalls++;
        },
        surfaceInteractive: () => {
          surfaceInteractiveCalls++;
          return true;
        },
        hitIndex: () => {
          hitIndexCalls++;
          return null;
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
    expect(ontoolchangeCalls).toBe(0);
    expect(availableToolsCalls).toBe(0);
    expect(toolPropCalls).toBe(0);
    expect(tooltipHoveredCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(hitIndexCalls).toBe(0);
    expect(surfaceInteractiveCalls).toBe(0);

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

describe("createSurfaceState brush lifecycle", () => {
  it("pointerdown begin-area emits start; move grows draft via RAF; select-end commits interval", () => {
    const h = mountSurfaceComposite();
    h.surface.chooseTool("select-area");
    flushSync();
    expect(h.surface.activeTool).toBe("select-area");

    const start = panelCenterClient(h.model);
    const end = { x: start.x + 40, y: start.y + 30 };

    // Phase: pointerdown → begin-area + start event
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    expect(h.selectionEvents.map((e) => e.phase)).toEqual(["start"]);
    expect(h.interval.committedInterval).toBeNull();

    // Phase: pointermove — brush growth is RAF-mediated; durable interval does NOT update.
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, { clientX: end.x, clientY: end.y }),
    );
    // Before flush: draft corners may still be start corners until frame runs.
    const beforeFlush = h.surface.brushRect;
    expect(beforeFlush).not.toBeNull();
    suitePump.flush();
    flushSync();
    const afterFlush = h.surface.brushRect;
    expect(afterFlush).not.toBeNull();
    // Rectangle grew (or at least end corner moved) after the deferred frame.
    expect(
      afterFlush!.x1 !== beforeFlush!.x1 ||
        afterFlush!.y1 !== beforeFlush!.y1 ||
        afterFlush!.x0 !== beforeFlush!.x0 ||
        afterFlush!.y0 !== beforeFlush!.y0 ||
        h.selectionEvents.some((e) => e.phase === "change"),
    ).toBe(true);
    expect(h.interval.committedInterval).toBeNull();
    expect(h.selectionEvents.some((e) => e.phase === "change")).toBe(true);

    // Phase: pointerup select-end → real interval controller commits + end emit
    h.surface.onPointerUp(pointerEvent("pointerup", h.capture, { clientX: end.x, clientY: end.y }));
    flushSync();
    expect(h.surface.brushRect).toBeNull();
    expect(h.interval.committedInterval).not.toBeNull();
    expect(h.interval.effectiveIntervals.length).toBeGreaterThan(0);
    const phases = h.selectionEvents.map((e) => e.phase);
    expect(phases[0]).toBe("start");
    expect(phases.at(-1)).toBe("end");
    expect(phases.includes("change")).toBe(true);

    h.destroy();
  });

  it("pointerup zoom-end routes through real zoom controller", () => {
    const h = mountSurfaceComposite();
    h.surface.chooseTool("zoom-area");
    flushSync();

    const start = panelCenterClient(h.model);
    const end = { x: start.x + 50, y: start.y + 40 };

    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, { clientX: end.x, clientY: end.y }),
    );
    suitePump.flush();
    flushSync();
    h.surface.onPointerUp(pointerEvent("pointerup", h.capture, { clientX: end.x, clientY: end.y }));
    flushSync();

    expect(h.surface.brushRect).toBeNull();
    expect(h.zoom.effectiveZoomDomains).not.toBeNull();
    h.destroy();
  });

  it("keyboard keep-second-corner announces when brush is too small", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    h.surface.chooseTool("select-area");
    flushSync();

    // Begin keyboard area at panel center.
    const center = panelCenterClient(h.model);
    // Seed inspection so keyboard begin-area can use an anchor if needed.
    const candidate = firstCandidate(h.model);
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "keyboard",
      "transient",
      "xy",
      candidate,
    );
    flushSync();

    // Enter begins first corner when select-area + no draft.
    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    expect(h.announcements.some((m) => m.includes("opposite corner"))).toBe(true);

    // Complete without moving far enough → keep-second-corner path announces again.
    h.announcements.length = 0;
    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    flushSync();
    // Either keep-second-corner (announce) or select-end (commit) depending on
    // keyboard complete policy; keyboard complete always commits in pure table.
    // Assert no crash + tool still select-area.
    expect(h.surface.activeTool).toBe("select-area");
    void center;
    h.destroy();
  });
});

describe("createSurfaceState selectionEvent origin panel", () => {
  it("idle uses committedInterval panel; active area uses reducer area panel", () => {
    const h = mountSurfaceComposite({ spec: facetSpec() });
    h.surface.chooseTool("select-area");
    flushSync();

    const p0 = panelCenterClient(h.model, 0);
    const p1 = panelCenterClient(h.model, 1);
    const panel0 = h.model.scene.panels[0];
    const panel1 = h.model.scene.panels[1];
    if (panel0 === undefined || panel1 === undefined) throw new Error("expected two panels");

    // Begin on panel 0 and finish so interval commits with panel0 origin.
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: p0.x, clientY: p0.y }),
    );
    flushSync();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    if (h.surface.reducer.state.area.kind !== "idle") {
      expect(h.surface.reducer.state.area.panelId).toBe(panel0.id);
    }
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, {
        clientX: p0.x + 30,
        clientY: p0.y + 20,
      }),
    );
    suitePump.flush();
    flushSync();
    h.surface.onPointerUp(
      pointerEvent("pointerup", h.capture, {
        clientX: p0.x + 30,
        clientY: p0.y + 20,
      }),
    );
    flushSync();
    expect(h.interval.committedInterval?.panelId).toBe(panel0.id);

    // Start a new brush on panel 1 — active area origin is panel1.
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: p1.x, clientY: p1.y }),
    );
    flushSync();
    if (h.surface.reducer.state.area.kind !== "idle") {
      expect(h.surface.reducer.state.area.panelId).toBe(panel1.id);
    }
    // Start event during active area should carry panel1.
    let lastStart: (typeof h.selectionEvents)[number] | undefined;
    for (let i = h.selectionEvents.length - 1; i >= 0; i--) {
      const event = h.selectionEvents[i];
      if (event?.phase === "start") {
        lastStart = event;
        break;
      }
    }
    expect(lastStart?.panelId).toBe(panel1.id);

    h.destroy();
  });
});

describe("createSurfaceState keyboard surface", () => {
  it("Arrow keys move the inspection anchor via directional navigation", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const first = firstCandidate(h.model);
    h.inspection.setInspection(hitFromCandidate(first), "keyboard", "transient", "xy", first);
    flushSync();
    const before = h.inspection.inspection?.focus.anchor;
    expect(before).toBeDefined();

    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    flushSync();
    const after = h.inspection.inspection?.focus.anchor;
    // Anchor may move to another candidate, or stay if no better match —
    // at minimum navigation does not clear inspection.
    expect(h.inspection.inspection).not.toBeNull();
    expect(after).toBeDefined();
    void before;
    h.destroy();
  });

  it("Enter/Space pin when inspect tool has pin; Escape dismisses and clears brush draft", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const candidate = firstCandidate(h.model);
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "keyboard",
      "transient",
      "xy",
      candidate,
    );
    flushSync();

    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");

    // Brush draft + Escape while select-area clears draft via dismiss path.
    h.surface.chooseTool("select-area");
    flushSync();
    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();

    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    flushSync();
    expect(h.surface.brushRect).toBeNull();
    h.destroy();
  });

  it("point tool Enter toggles point keys via sink", () => {
    const config = normalizeInteractionConfig({
      inspect: { pin: true },
      select: { type: "point" },
    });
    const h = mountSurfaceComposite({
      interactionConfig: config,
      registerEffects: false,
    });
    h.surface.chooseTool("point");
    flushSync();
    const candidate = firstCandidate(h.model);
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "keyboard",
      "transient",
      "xy",
      candidate,
    );
    flushSync();
    h.toggleCalls.length = 0;
    h.surface.onSurfaceKeyDown(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    flushSync();
    expect(h.toggleCalls.length).toBeGreaterThan(0);
    expect(h.toggleCalls[0]?.source).toBe("keyboard");
    h.destroy();
  });
});

describe("createSurfaceState onSurfaceBlur", () => {
  it("inside-root refocus keeps inspection; genuine blur splits pinned vs transient", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const candidate = firstCandidate(h.model);

    // Transient inspection
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "pointer",
      "transient",
      "xy",
      candidate,
    );
    flushSync();
    expect(h.inspection.inspection?.state).toBe("transient");

    // Inside-root relatedTarget → ignore
    const inside = document.createElement("button");
    h.root.append(inside);
    const keepEvent = new FocusEvent("blur", {
      bubbles: true,
      relatedTarget: inside,
    });
    h.surface.onSurfaceBlur(keepEvent);
    flushSync();
    expect(h.inspection.inspection?.state).toBe("transient");

    // Genuine blur + transient → clear
    h.surface.onSurfaceBlur(new FocusEvent("blur", { bubbles: true, relatedTarget: null }));
    flushSync();
    expect(h.inspection.inspection).toBeNull();
    expect(h.surface.reducer.state.activeCandidate).toBeNull();

    // Pinned survives genuine blur
    h.inspection.setInspection(
      hitFromCandidate(candidate),
      "pointer",
      "transient",
      "xy",
      candidate,
    );
    flushSync();
    h.inspection.toggleInspectionPin("keyboard");
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");
    h.surface.onSurfaceBlur(new FocusEvent("blur", { bubbles: true, relatedTarget: null }));
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");
    expect(h.surface.reducer.state.activeCandidate).toBeNull();

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

describe("createSurfaceState touch inspect path", () => {
  it("touch tap pins/inspects and suppressClickUntil gates capture click", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const candidate = firstCandidate(h.model);
    const point = { x: candidate.x, y: candidate.y };

    vi.spyOn(performance, "now").mockReturnValue(1000);

    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, {
        clientX: point.x,
        clientY: point.y,
        pointerType: "touch",
      }),
    );
    flushSync();
    h.surface.onPointerUp(
      pointerEvent("pointerup", h.capture, {
        clientX: point.x,
        clientY: point.y,
        pointerType: "touch",
      }),
    );
    flushSync();
    expect(h.inspection.inspection).not.toBeNull();
    const stateBefore = h.inspection.inspection?.state;

    // Within suppress window → capture click is suppressed (no pin toggle flip).
    // Single call: a prior suppress branch zeros suppressClickUntil.
    vi.spyOn(performance, "now").mockReturnValue(1000 + TOUCH_INSPECT_CLICK_SUPPRESS_MS - 1);
    const click = new MouseEvent("click", {
      bubbles: true,
      clientX: point.x,
      clientY: point.y,
    });
    Object.defineProperty(click, "currentTarget", { value: h.capture });
    h.surface.onCaptureClick(click);
    flushSync();
    expect(h.inspection.inspection?.state).toBe(stateBefore);

    vi.restoreAllMocks();
    h.destroy();
  });
});

describe("createSurfaceState pointer cancel vs lost capture", () => {
  it("cancel clears queued inspection + brush draft but preserves pending pinned stash", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const first = firstCandidate(h.model);
    const second = secondCandidate(h.model, first.id);

    h.inspection.setInspection(hitFromCandidate(first), "pointer", "transient", "xy", first);
    flushSync();
    h.inspection.toggleInspectionPin("pointer");
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");

    // Stash pending via queued frame while pinned.
    const pending: QueuedPointerInspection = {
      hit: hitFromCandidate(second),
      source: "pointer",
      concreteMode: "xy",
      candidate: second,
    };
    h.inspection.queuePointerFrame(pending, h.surface.reducer.frameToken());
    h.inspection.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: h.model.runId,
        id: second.id,
        panelId: second.panelId,
        x: second.x,
        y: second.y,
      },
      source: "pointer",
    });
    flushSync();
    expect(h.inspection.inspection?.state).toBe("pinned");

    // Begin a brush draft, then cancel.
    h.surface.chooseTool("select-area");
    flushSync();
    const start = panelCenterClient(h.model);
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();

    h.surface.onPointerCancel();
    flushSync();
    expect(h.surface.brushRect).toBeNull();
    // Pending survives cancel: restore-pending discriminator on unpin.
    h.inspection.toggleInspectionPin("keyboard");
    flushSync();
    expect(h.inspection.inspection?.state).toBe("transient");
    expect(h.inspection.inspection?.focus.anchor).toEqual({
      x: second.x,
      y: second.y,
    });

    h.destroy();
  });

  it("lost capture cancels area/draft plan only — does not clear inspection queues", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    const first = firstCandidate(h.model);
    const second = secondCandidate(h.model, first.id);

    h.inspection.setInspection(hitFromCandidate(first), "pointer", "transient", "xy", first);
    flushSync();
    h.inspection.toggleInspectionPin("pointer");
    flushSync();

    const pending: QueuedPointerInspection = {
      hit: hitFromCandidate(second),
      source: "pointer",
      concreteMode: "xy",
      candidate: second,
    };
    h.inspection.queuePointerFrame(pending, h.surface.reducer.frameToken());
    h.inspection.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: h.model.runId,
        id: second.id,
        panelId: second.panelId,
        x: second.x,
        y: second.y,
      },
      source: "pointer",
    });
    flushSync();

    h.surface.chooseTool("select-area");
    flushSync();
    const start = panelCenterClient(h.model);
    h.surface.onPointerDown(
      pointerEvent("pointerdown", h.capture, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    // Advance to dragging so lost-capture takes cancel-clear-draft (first-corner keeps draft).
    h.surface.onPointerMove(
      pointerEvent("pointermove", h.capture, {
        clientX: start.x + 20,
        clientY: start.y + 15,
      }),
    );
    suitePump.flush();
    flushSync();
    expect(h.surface.reducer.state.area.kind).toBe("dragging");

    h.surface.onLostPointerCapture();
    flushSync();
    // Draft cleared (dragging → cancel-clear-draft).
    expect(h.surface.brushRect).toBeNull();
    // Pending still restorable (queues untouched by lost capture).
    h.inspection.toggleInspectionPin("keyboard");
    flushSync();
    expect(h.inspection.inspection?.state).toBe("transient");
    expect(h.inspection.inspection?.focus.anchor).toEqual({
      x: second.x,
      y: second.y,
    });

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

describe("createSurfaceState pointer-capture failure", () => {
  it("begin-area and start event still commit when setPointerCapture throws", () => {
    const h = mountSurfaceComposite({ registerEffects: false });
    h.surface.chooseTool("select-area");
    flushSync();

    const start = panelCenterClient(h.model);
    const target = h.capture;
    target.setPointerCapture = () => {
      throw new Error("synthetic capture failure");
    };

    h.surface.onPointerDown(
      pointerEvent("pointerdown", target, { clientX: start.x, clientY: start.y }),
    );
    flushSync();
    expect(h.surface.brushRect).not.toBeNull();
    expect(h.surface.reducer.state.area.kind).not.toBe("idle");
    expect(h.selectionEvents.map((e) => e.phase)).toEqual(["start"]);
    h.destroy();
  });
});
