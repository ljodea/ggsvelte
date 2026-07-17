/**
 * Zoom controller unit + integration tests (S4 extraction).
 * Factories own deriveds — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { RenderModel } from "@ggsvelte/core";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import type {
  PlotInteractionEvent,
  PlotInteractionScope,
  ResolvedInteractionConfig,
  ZoomEvent,
} from "../../src/lib/interaction/interaction.js";
import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import type { ContinuousZoomDomains } from "../../src/lib/scene/geometry.js";
import { createPlotRuntime } from "../../src/lib/runtime/runtime.svelte.js";
import { createPlotZoomState } from "../../src/lib/zoom/zoom-state.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { modelFor } from "../helpers/model.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import { createReactiveRuntimeDeps } from "../helpers/runtime-deps.svelte.js";

const zoomRows = [
  { id: "a", x: 1, y: 1 },
  { id: "b", x: 10, y: 20 },
];

type ZoomCb = ((event: ZoomEvent) => void) | undefined;
const noZoomCallback = (): ZoomCb => undefined;

type InteractionCb = ((event: PlotInteractionEvent) => void) | undefined;
const noInteractionCallback = (): InteractionCb => undefined;

type MaybeController = ReturnType<typeof createPlotInteraction> | undefined;
/** Getter that supplies no interaction controller (chart-local mode). */
const noController = (): MaybeController => undefined;

const defaultScope: PlotInteractionScope = {
  keys: "plot",
  x: "x",
  y: "y",
};

type ZoomConfig = ResolvedInteractionConfig["zoom"];
const xyZoomConfig = (): ZoomConfig =>
  Object.freeze({ mode: "xy" as const, trigger: "brush" as const });
const xOnlyZoomConfig = (): ZoomConfig =>
  Object.freeze({ mode: "x" as const, trigger: "brush" as const });

function continuousSpec(
  data: readonly { id: string; x: number; y: number }[] = zoomRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y" }))
    .geomPoint()
    .spec();
}

function bandXSpec(): PortableSpec {
  return gg(
    [
      { id: "a", x: "north", y: 1 },
      { id: "b", x: "south", y: 20 },
    ],
    aes({ x: "x", y: "y" }),
  )
    .geomPoint()
    .spec();
}

function bothBandSpec(): PortableSpec {
  return gg(
    [
      { id: "a", x: "north", y: "low" },
      { id: "b", x: "south", y: "high" },
    ],
    aes({ x: "x", y: "y" }),
  )
    .geomPoint()
    .spec();
}

function flippedSpec(): PortableSpec {
  return gg([...zoomRows], aes({ x: "x", y: "y" }))
    .geomPoint()
    .coord("flip")
    .spec();
}

type ZoomHarness = {
  state: ReturnType<typeof createPlotZoomState>;
  destroy: () => void;
};

/**
 * Mount the controller with production-shaped deps: every reactive dep is a
 * getter (mirroring PlotZoomStateDeps). Tests that need reactivity pass
 * getters over their own reactive boxes; omitted options get static defaults.
 */
function mountZoomController(
  options: {
    interaction?: () => MaybeController;
    resolvedInteractionScope?: () => PlotInteractionScope;
    zoomConfig?: () => ZoomConfig;
    assembled?: () => PortableSpec | null;
    model?: () => RenderModel | null;
    coordFlipped?: () => boolean;
    onzoom?: () => ZoomCb;
    oninteraction?: () => InteractionCb;
    announce?: (message: string) => void;
  } = {},
): ZoomHarness {
  const defaultAssembled = continuousSpec();
  const defaultModel = modelFor(defaultAssembled);

  const { value: state, destroy } = withFlushedEffectRoot(() =>
    createPlotZoomState({
      interaction: options.interaction ?? noController,
      resolvedInteractionScope: options.resolvedInteractionScope ?? (() => defaultScope),
      zoomConfig: options.zoomConfig ?? xyZoomConfig,
      assembled: options.assembled ?? (() => defaultAssembled),
      model: options.model ?? (() => defaultModel),
      coordFlipped: options.coordFlipped ?? (() => false),
      onzoom: options.onzoom ?? noZoomCallback,
      oninteraction: options.oninteraction ?? noInteractionCallback,
      announce: options.announce ?? (() => {}),
    }),
  );

  return { state, destroy };
}

describe("createPlotZoomState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let modelCalls = 0;
    let coordFlippedCalls = 0;
    let announceCalls = 0;

    const { value: state, destroy } = withEffectRoot(() =>
      createPlotZoomState({
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        zoomConfig: xyZoomConfig,
        assembled: () => continuousSpec(),
        model: () => {
          modelCalls++;
          return null;
        },
        coordFlipped: () => {
          coordFlippedCalls++;
          return false;
        },
        onzoom: noZoomCallback,
        oninteraction: noInteractionCallback,
        announce: () => {
          announceCalls++;
        },
      }),
    );

    expect(modelCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(announceCalls).toBe(0);
    // Deriveds are lazy on client and server at the 5.33.1 floor, so this
    // guard proves the exposed accessors reach no armed getter (reads + one
    // flush below) — the construction-read discipline. Direct (non-derived)
    // construction-time reads of armed deps would throw right here.
    expect(state.effectiveZoomDomains).toBeNull();
    expect(state.effectiveSpec).not.toBeNull();
    flushSync();
    expect(modelCalls).toBe(0);
    expect(coordFlippedCalls).toBe(0);
    expect(announceCalls).toBe(0);
    destroy();
  });
});

describe("createPlotZoomState local mode", () => {
  it("commitZoom sets local domains, emits ordered sinks; resetZoom early-returns or clears", () => {
    type Sink = "announce" | "onzoom" | "oninteraction";
    const order: Sink[] = [];
    const zoomEvents: ZoomEvent[] = [];
    const announcements: string[] = [];
    const domains: ContinuousZoomDomains = { x: [2, 8], y: [4, 16] };

    const { state, destroy } = mountZoomController({
      onzoom: () => (event) => {
        order.push("onzoom");
        zoomEvents.push(event);
      },
      oninteraction: () => (event) => {
        order.push("oninteraction");
        zoomEvents.push(event as ZoomEvent);
      },
      announce: (message) => {
        order.push("announce");
        announcements.push(message);
      },
    });

    state.commitZoom(domains, "pointer");
    flushSync();
    expect(state.effectiveZoomDomains).toEqual(domains);
    // Pin the ACTUAL buildZoomEvent literal (plot-zoom.ts) — not a recompute.
    expect(zoomEvents[0]).toEqual({
      type: "zoom",
      phase: "end",
      source: "pointer",
      domains: { x: [2, 8], y: [4, 16] },
    });
    expect(order).toEqual(["announce", "onzoom", "oninteraction"]);
    expect(announcements).toEqual(["Zoom complete."]);

    // resetZoom WITH active domains → null-commit: full clear emission
    // (the early-return case is the second reset below, once effective is null).
    order.length = 0;
    zoomEvents.length = 0;
    announcements.length = 0;
    state.resetZoom();
    flushSync();
    expect(state.effectiveZoomDomains).toBeNull();
    expect(order).toEqual(["announce", "onzoom", "oninteraction"]);
    expect(zoomEvents[0]).toEqual({
      type: "zoom",
      phase: "clear",
      source: "programmatic",
      domains: null,
    });
    expect(announcements).toEqual(["Zoom reset."]);

    // Second reset with null domains → early return.
    order.length = 0;
    zoomEvents.length = 0;
    announcements.length = 0;
    state.resetZoom("pointer");
    flushSync();
    expect(order).toEqual([]);
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);

    destroy();
  });
});

describe("createPlotZoomState controller mode", () => {
  it("writes through setZoom; x-only mode filters shared y; no-transition skips emit", () => {
    const controller = createPlotInteraction();
    const fullScope: PlotInteractionScope = { keys: "plot", x: "x-mm", y: "y-mm" };
    const zoomEvents: ZoomEvent[] = [];
    const announcements: string[] = [];

    // Production-shaped plain getter: recompute must flow from the
    // controller's own revision tracking, not test scaffolding.
    const { state, destroy } = mountZoomController({
      interaction: () => controller,
      resolvedInteractionScope: () => fullScope,
      zoomConfig: xOnlyZoomConfig,
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    expect(state.effectiveZoomDomains).toBeNull();

    // Seed BOTH channels on the shared controller via a full-scope write.
    controller.setZoom({ x: [1, 5], y: [10, 50] }, { scope: fullScope, source: "programmatic" });
    flushSync();
    // x-only mode filters shared y domains for this plot's effective bag.
    expect(state.effectiveZoomDomains).toEqual({ x: [1, 5] });
    // Shared y is still present for a full-scope reader.
    expect(controller.zoom(fullScope)).toEqual({ x: [1, 5], y: [10, 50] });

    // setZoom-style commit writes through (interaction.setZoom) with the
    // mode-filtered mutation scope — must not clobber shared y.
    zoomEvents.length = 0;
    announcements.length = 0;
    state.commitZoom({ x: [2, 8] }, "programmatic");
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [2, 8] });
    expect(controller.zoom(fullScope)).toEqual({ x: [2, 8], y: [10, 50] });
    expect(zoomEvents).toHaveLength(1);
    expect(announcements).toEqual(["Zoom complete."]);

    // No-transition: committing domains the shared controller already stores
    // → transition === null early return — NO zoom event, NO announcement.
    zoomEvents.length = 0;
    announcements.length = 0;
    state.commitZoom({ x: [2, 8] }, "programmatic");
    flushSync();
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);
    expect(state.effectiveZoomDomains).toEqual({ x: [2, 8] });

    destroy();
  });
});

describe("createPlotZoomState stableZoomDomains memoization", () => {
  it("returns the same reference when controller revision bumps without domain change", () => {
    const controller = createPlotInteraction();
    const fullScope: PlotInteractionScope = { keys: "plot", x: "x-mm", y: "y-mm" };

    const { state, destroy } = mountZoomController({
      interaction: () => controller,
      resolvedInteractionScope: () => fullScope,
    });

    controller.setZoom({ x: [1, 5], y: [2, 6] }, { scope: fullScope, source: "programmatic" });
    flushSync();
    const first = state.effectiveZoomDomains;
    expect(first).toEqual({ x: [1, 5], y: [2, 6] });

    // Bump revision WITHOUT changing zoom domains (e.g. setEmphasis).
    controller.setEmphasis(["a"], { scope: fullScope, source: "programmatic" });
    flushSync();
    const second = state.effectiveZoomDomains;
    expect(second).toBe(first);

    destroy();
  });
});

describe("createPlotZoomState effectiveSpec", () => {
  it("null domains returns assembled by reference; domains land in scale domain", () => {
    const assembled = continuousSpec();
    const { state, destroy } = mountZoomController({
      assembled: () => assembled,
    });

    expect(state.effectiveSpec).toBe(assembled);

    state.commitZoom({ x: [3, 7] }, "programmatic");
    flushSync();
    const next = state.effectiveSpec;
    expect(next).not.toBe(assembled);
    // Independent literal — do not recompute via applyZoomToSpec in the test.
    expect(next?.scales?.x?.domain).toEqual([3, 7]);
    expect(next?.scales?.x).toMatchObject({ nice: false });

    destroy();
  });
});

describe("createPlotZoomState setZoomDomains", () => {
  it("partial x-only update preserves y; rejection with null current; pass-through with current", () => {
    const zoomEvents: ZoomEvent[] = [];
    const { state, destroy } = mountZoomController({
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
    });

    // Rejection path: invalid/empty partial with current === null → no commit.
    state.setZoomDomains({ x: [Number.NaN, 1] });
    flushSync();
    expect(state.effectiveZoomDomains).toBeNull();
    expect(zoomEvents).toEqual([]);

    state.setZoomDomains({ x: [1, 5], y: [2, 8] });
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [1, 5], y: [2, 8] });
    expect(zoomEvents).toHaveLength(1);

    // Partial x-only update preserves y.
    state.setZoomDomains({ x: [3, 9] });
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [3, 9], y: [2, 8] });

    // Non-null-current pass-through: sanitizePartialZoomDomains PRESERVES
    // existing domains, so an invalid partial with non-null current can still
    // return the current bag and legitimately emit.
    const before = zoomEvents.length;
    state.setZoomDomains({ x: [Number.NaN, Number.NaN] });
    flushSync();
    // Current bag returned → commit of the same domains still emits (local mode
    // always assigns, no transition-null short-circuit).
    expect(state.effectiveZoomDomains).toEqual({ x: [3, 9], y: [2, 8] });
    expect(zoomEvents.length).toBe(before + 1);

    destroy();
  });
});

describe("createPlotZoomState applyBrushZoom", () => {
  it("commits inverted continuous domains; both-band skips; mixed commits continuous only; flipped inverts axes", () => {
    const zoomEvents: ZoomEvent[] = [];
    const continuous = modelFor(continuousSpec());
    const panel = continuous.scene.panels[0];
    // Brush the middle ~60% of the panel so invert yields interior domains.
    const rect = {
      x0: panel.x + panel.width * 0.2,
      y0: panel.y + panel.height * 0.2,
      x1: panel.x + panel.width * 0.8,
      y1: panel.y + panel.height * 0.8,
    };

    const contModel = reactiveBox<RenderModel | null>(continuous);
    const flipped = reactiveBox(false);
    const { state, destroy } = mountZoomController({
      model: () => contModel.value,
      coordFlipped: () => flipped.value,
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
    });

    state.applyBrushZoom(rect, "pointer");
    flushSync();
    expect(zoomEvents).toHaveLength(1);
    expect(zoomEvents[0]?.phase).toBe("end");
    expect(zoomEvents[0]?.domains?.x).toBeDefined();
    expect(zoomEvents[0]?.domains?.y).toBeDefined();
    // Domain endpoints must be interior to trained continuous domains [1,10]/[0,20].
    const dx = zoomEvents[0].domains!.x!;
    const dy = zoomEvents[0].domains!.y!;
    expect(dx[0]).toBeGreaterThan(1);
    expect(dx[1]).toBeLessThan(10);
    expect(dy[0]).toBeGreaterThan(0);
    expect(dy[1]).toBeLessThan(20);

    // Both-band scales → NO-event skip (every channel non-invertible).
    zoomEvents.length = 0;
    state.resetZoom();
    flushSync();
    zoomEvents.length = 0;
    contModel.set(modelFor(bothBandSpec()));
    flushSync();
    state.applyBrushZoom(rect, "pointer");
    flushSync();
    expect(zoomEvents).toEqual([]);
    expect(state.effectiveZoomDomains).toBeNull();

    // Mixed: one band + one continuous, mode "xy" → commits ONLY continuous.
    contModel.set(modelFor(bandXSpec()));
    flushSync();
    state.applyBrushZoom(rect, "pointer");
    flushSync();
    expect(zoomEvents).toHaveLength(1);
    expect(zoomEvents[0]?.domains?.x).toBeUndefined();
    expect(zoomEvents[0]?.domains?.y).toBeDefined();

    // coordFlipped getter: with an ASYMMETRIC rect (60% of the horizontal
    // span, 20% of the vertical span), flip swaps which data channel each
    // screen axis selects — the x data domain must come from the NARROW
    // vertical band and the y data domain from the WIDE horizontal band.
    // (Any "some domain is defined" assertion would be tautological: it
    // passes even when the flipped flag is ignored.)
    zoomEvents.length = 0;
    state.resetZoom();
    flushSync();
    zoomEvents.length = 0;
    const flippedModel = modelFor(flippedSpec());
    contModel.set(flippedModel);
    flipped.set(true);
    flushSync();
    const flippedPanel = flippedModel.scene.panels[0];
    const asymRect = {
      x0: flippedPanel.x + flippedPanel.width * 0.2,
      y0: flippedPanel.y + flippedPanel.height * 0.4,
      x1: flippedPanel.x + flippedPanel.width * 0.8,
      y1: flippedPanel.y + flippedPanel.height * 0.6,
    };
    state.applyBrushZoom(asymRect, "pointer");
    flushSync();
    expect(zoomEvents).toHaveLength(1);
    const fx = zoomEvents[0].domains!.x!;
    const fy = zoomEvents[0].domains!.y!;
    const [tx0, tx1] = flippedModel.scales.x.domain as [number, number];
    const [ty0, ty1] = flippedModel.scales.y.domain as [number, number];
    const xFraction = (fx[1] - fx[0]) / (tx1 - tx0);
    const yFraction = (fy[1] - fy[0]) / (ty1 - ty0);
    // Narrow (~0.2) x span vs wide (~0.6) y span — fails if flip is ignored
    // (the spans would then mirror the rect: ~0.6 x, ~0.2 y).
    expect(xFraction).toBeLessThan(0.35);
    expect(yFraction).toBeGreaterThan(0.45);

    destroy();
  });
});

describe("createPlotZoomState onDblClick", () => {
  it("no-ops when zoom config is null; with domains resets with source pointer", () => {
    const zoomConfig = reactiveBox<ZoomConfig>(null);
    const zoomEvents: ZoomEvent[] = [];
    const { state, destroy } = mountZoomController({
      zoomConfig: () => zoomConfig.value,
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
    });

    state.commitZoom({ x: [1, 5] }, "programmatic");
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [1, 5] });

    // zoom config null → no-op (even with domains).
    zoomEvents.length = 0;
    state.onDblClick();
    flushSync();
    expect(state.effectiveZoomDomains).toEqual({ x: [1, 5] });
    expect(zoomEvents).toEqual([]);

    zoomConfig.set(Object.freeze({ mode: "xy" as const, trigger: "brush" as const }));
    flushSync();
    state.onDblClick();
    flushSync();
    expect(state.effectiveZoomDomains).toBeNull();
    expect(zoomEvents).toEqual([
      {
        type: "zoom",
        phase: "clear",
        source: "pointer",
        domains: null,
      },
    ]);

    destroy();
  });
});

describe("createPlotZoomState resetForScales", () => {
  it("silently nulls domains in both ownership modes (no zoom event, no announcement)", () => {
    const zoomEvents: ZoomEvent[] = [];
    const announcements: string[] = [];

    // Local mode.
    const local = mountZoomController({
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });
    local.state.commitZoom({ x: [1, 5], y: [2, 8] }, "pointer");
    flushSync();
    expect(local.state.effectiveZoomDomains).not.toBeNull();
    zoomEvents.length = 0;
    announcements.length = 0;

    local.state.resetForScales();
    flushSync();
    expect(local.state.effectiveZoomDomains).toBeNull();
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);
    local.destroy();

    // Controller mode: interaction.resetZoom with mode-filtered scope, no emission.
    const controller = createPlotInteraction();
    const fullScope: PlotInteractionScope = { keys: "plot", x: "x-mm", y: "y-mm" };
    const ctrl = mountZoomController({
      interaction: () => controller,
      resolvedInteractionScope: () => fullScope,
      zoomConfig: xOnlyZoomConfig,
      onzoom: () => (event) => {
        zoomEvents.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });
    controller.setZoom({ x: [1, 5], y: [10, 50] }, { scope: fullScope, source: "programmatic" });
    flushSync();
    expect(ctrl.state.effectiveZoomDomains).toEqual({ x: [1, 5] });
    zoomEvents.length = 0;
    announcements.length = 0;

    ctrl.state.resetForScales();
    flushSync();
    // x-only filtered scope: x cleared, shared y preserved.
    expect(controller.zoom(fullScope)).toEqual({ y: [10, 50] });
    expect(ctrl.state.effectiveZoomDomains).toBeNull();
    expect(zoomEvents).toEqual([]);
    expect(announcements).toEqual([]);
    ctrl.destroy();
  });
});

describe("runtime + zoom real cycle", () => {
  it("commit zoom retrains model with explicit domains; resetForScales via runtime clears them", () => {
    const initialSpec = continuousSpec();
    const zoomEvents: ZoomEvent[] = [];

    const { value, destroy } = withFlushedEffectRoot(() => {
      // Host wiring: zoom factory BEFORE createPlotRuntime; runtime deps
      // wired to controller aliases.
      const assembledBox = reactiveBox<PortableSpec | null>(initialSpec);
      const zoom = createPlotZoomState({
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        zoomConfig: xyZoomConfig,
        assembled: () => assembledBox.value,
        model: () => runtime.model,
        coordFlipped: () => false,
        onzoom: () => (event) => {
          zoomEvents.push(event);
        },
        oninteraction: noInteractionCallback,
        announce: () => {},
      });
      // Host aliases (construction-order DAG).
      const effectiveZoomDomains = () => zoom.effectiveZoomDomains;
      const effectiveSpec = () => zoom.effectiveSpec;
      const runtimeDeps = createReactiveRuntimeDeps({
        assembled: initialSpec,
        effectiveSpec: initialSpec,
      });
      // Override getters to read controller aliases (production shape).
      const runtime = createPlotRuntime({
        widthProp: runtimeDeps.widthProp,
        heightProp: runtimeDeps.heightProp,
        assembled: () => assembledBox.value,
        effectiveSpec,
        effectiveZoomDomains,
        effectiveLegendFilters: () => [],
        root: runtimeDeps.root,
        resetZoom: () => {
          zoom.resetForScales();
        },
        onrender: runtimeDeps.onrender,
      });
      runtime.registerModelEffects();
      return { runtime, zoom };
    });

    const { runtime, zoom } = value;
    expect(runtime.model).not.toBeNull();
    const trainedX = [...(runtime.model!.scales.x.domain as [number, number])];

    // Commit zoom → model retrains with the committed explicit domains
    // (applyZoomToSpec does not clamp).
    zoom.commitZoom({ x: [3, 7], y: [5, 15] }, "pointer");
    flushSync();
    expect(zoom.effectiveZoomDomains).toEqual({ x: [3, 7], y: [5, 15] });
    expect(runtime.model).not.toBeNull();
    // Explicit domains land on the trained scales (not clamped to data).
    expect(runtime.model!.scales.x.domain).toEqual([3, 7]);
    expect(runtime.model!.scales.y.domain).toEqual([5, 15]);
    expect(runtime.model!.scales.x.domain).not.toEqual(trainedX);
    expect(zoomEvents).toHaveLength(1);

    // resetForScales via runtime.resetScales() path clears them.
    runtime.resetScales();
    flushSync();
    expect(zoom.effectiveZoomDomains).toBeNull();
    // Model retrains from the un-zoomed assembled spec.
    expect(runtime.model!.scales.x.domain).toEqual(trainedX);
    // Silent: no additional zoom event from resetForScales.
    expect(zoomEvents).toHaveLength(1);

    destroy();
  });
});

describe("createPlotZoomState callback replacement", () => {
  it("replaces onzoom AND oninteraction post-flush; each new callback receives the event", () => {
    const firstZoom: ZoomEvent[] = [];
    const firstInteraction: ZoomEvent[] = [];
    const secondZoom: ZoomEvent[] = [];
    const secondInteraction: ZoomEvent[] = [];
    const zoomBox = reactiveBox<ZoomCb>((event) => {
      firstZoom.push(event);
    });
    const interactionBox = reactiveBox<InteractionCb>((event) => {
      firstInteraction.push(event as ZoomEvent);
    });

    const { state, destroy } = mountZoomController({
      onzoom: () => zoomBox.value,
      oninteraction: () => interactionBox.value,
    });

    state.commitZoom({ x: [1, 5] }, "pointer");
    flushSync();
    expect(firstZoom).toHaveLength(1);
    expect(firstInteraction).toHaveLength(1);

    zoomBox.set((event) => {
      secondZoom.push(event);
    });
    interactionBox.set((event) => {
      secondInteraction.push(event as ZoomEvent);
    });

    state.commitZoom({ x: [2, 8] }, "pointer");
    flushSync();
    expect(secondZoom).toHaveLength(1);
    expect(secondInteraction).toHaveLength(1);
    expect(secondZoom[0]).toEqual({
      type: "zoom",
      phase: "end",
      source: "pointer",
      domains: { x: [2, 8] },
    });
    expect(secondInteraction[0]).toEqual(secondZoom[0]);
    // Old callbacks must not receive the second event.
    expect(firstZoom).toHaveLength(1);
    expect(firstInteraction).toHaveLength(1);

    destroy();
  });
});
