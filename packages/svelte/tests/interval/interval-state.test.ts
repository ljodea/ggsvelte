/**
 * Interval-selection + bounds-editor controller tests (S5 extraction).
 * Factories own deriveds + effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { CandidateFacts, RenderModel, ScenePanel } from "@ggsvelte/core";
import { encodeKey } from "@ggsvelte/core";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import type {
  InteractionSource,
  IntervalSelection,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../../src/lib/interaction/interaction.js";
import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import {
  createIntervalState,
  type IntervalStateDeps,
} from "../../src/lib/interval/interval-state.svelte.js";
import type { ContinuousZoomDomains } from "../../src/lib/scene/geometry.js";
import { buildIntervalSelection } from "../../src/lib/interval/interval.js";
import { withEffectRoot, withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { modelFor } from "../helpers/model.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";

const continuousRows = [
  { id: "a", x: 1, y: 1 },
  { id: "b", x: 10, y: 20 },
];

type SelectConfig = ResolvedInteractionConfig["select"];
type MaybeController = ReturnType<typeof createPlotInteraction> | undefined;

const defaultScope: PlotInteractionScope = {
  keys: "plot",
  x: "x",
  y: "y",
  intervals: "plot",
};

const noController = (): MaybeController => undefined;

const persistentSelect = (): SelectConfig =>
  Object.freeze({
    type: "interval" as const,
    mode: "xy" as const,
    multiple: false,
    persistent: true,
    preset: "independent" as const,
  });

const nonPersistentSelect = (): SelectConfig =>
  Object.freeze({
    type: "interval" as const,
    mode: "xy" as const,
    multiple: false,
    persistent: false,
    preset: "independent" as const,
  });

function continuousSpec(
  data: readonly { id: string; x: number; y: number }[] = continuousRows,
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

/** Identity semantic keys — enough for local consumption without a host service. */
function identityCandidateKeys(candidate: CandidateFacts): PropertyKey[] {
  if (candidate.rowIndex === null) return [];
  return [String(candidate.rowIndex)];
}

function brushEvent(
  model: RenderModel,
  overrides: Partial<{
    phase: IntervalSelection["phase"];
    mode: IntervalSelection["mode"];
    panelId: string | null;
    domain: IntervalSelection["domain"];
    keys: readonly PropertyKey[];
    source: InteractionSource;
  }> = {},
): IntervalSelection {
  const panel = model.scene.panels[0];
  if (panel === undefined) throw new Error("expected at least one panel");
  const panelId = overrides.panelId === undefined ? panel.id : overrides.panelId;
  return buildIntervalSelection({
    phase: overrides.phase ?? "end",
    mode: overrides.mode ?? "xy",
    panelId,
    domain: overrides.domain ?? {
      x: [2, 8],
      y: [4, 16],
    },
    pixels: {
      x0: panel.x + panel.width * 0.2,
      y0: panel.y + panel.height * 0.2,
      x1: panel.x + panel.width * 0.8,
      y1: panel.y + panel.height * 0.8,
    },
    keys: overrides.keys ?? ["0", "1"],
    lineageCount: overrides.keys?.length ?? 2,
    source: overrides.source ?? "pointer",
  });
}

type IntervalHarness = {
  state: ReturnType<typeof createIntervalState>;
  destroy: () => void;
};

/**
 * Mount the controller with production-shaped deps: every reactive dep is a
 * getter (mirroring IntervalStateDeps). Tests that need reactivity pass
 * getters over their own reactive boxes; omitted options get static defaults.
 */
function mountIntervalController(
  options: {
    model?: () => RenderModel | null;
    interaction?: () => MaybeController;
    resolvedInteractionScope?: () => PlotInteractionScope;
    selectConfig?: () => SelectConfig;
    effectiveZoomDomains?: () => ContinuousZoomDomains | null;
    commitZoom?: IntervalStateDeps["commitZoom"];
    coordFlipped?: () => boolean;
    captureSurface?: () => HTMLDivElement | null;
    candidateSemanticKeys?: (candidate: CandidateFacts) => PropertyKey[];
    sharedConsumptionCandidates?: IntervalStateDeps["sharedConsumptionCandidates"];
    inspectionPanel?: () => ScenePanel | null;
    emitSelection?: (event: PlotSelection) => void;
    announce?: (message: string) => void;
  } = {},
): IntervalHarness {
  const defaultModel = modelFor(continuousSpec());

  const { value: state, destroy } = withFlushedEffectRoot(() =>
    createIntervalState({
      model: options.model ?? (() => defaultModel),
      interaction: options.interaction ?? noController,
      resolvedInteractionScope: options.resolvedInteractionScope ?? (() => defaultScope),
      selectConfig: options.selectConfig ?? persistentSelect,
      effectiveZoomDomains: options.effectiveZoomDomains ?? (() => null),
      commitZoom: options.commitZoom ?? (() => {}),
      coordFlipped: options.coordFlipped ?? (() => false),
      captureSurface: options.captureSurface ?? (() => null),
      candidateSemanticKeys: options.candidateSemanticKeys ?? identityCandidateKeys,
      ...(options.sharedConsumptionCandidates !== undefined && {
        sharedConsumptionCandidates: options.sharedConsumptionCandidates,
      }),
      inspectionPanel: options.inspectionPanel ?? (() => null),
      emitSelection: options.emitSelection ?? (() => {}),
      announce: options.announce ?? (() => {}),
    }),
  );

  return { state, destroy };
}

describe("createIntervalState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let emitCalls = 0;
    let commitZoomCalls = 0;
    let announceCalls = 0;
    let inspectionPanelCalls = 0;
    let candidateSemanticKeysCalls = 0;
    // One stable model, as the host getter supplies (a fresh pipeline run per
    // read is not production-shaped and would defeat identity assertions).
    const constructionModel = modelFor(continuousSpec());

    const { value: state, destroy } = withEffectRoot(() =>
      createIntervalState({
        model: () => constructionModel,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        selectConfig: persistentSelect,
        effectiveZoomDomains: () => null,
        commitZoom: () => {
          commitZoomCalls++;
        },
        coordFlipped: () => false,
        captureSurface: () => null,
        // Issue #165 history: under the retired eager-SSR floor, a
        // pre-populated non-union controller + non-null model reached this
        // at construction. Deriveds are lazy at the 5.33.1 floor, so this
        // guard pins the common empty-intervals construction path only.
        candidateSemanticKeys: (candidate) => {
          candidateSemanticKeysCalls++;
          return identityCandidateKeys(candidate);
        },
        inspectionPanel: () => {
          inspectionPanelCalls++;
          return null;
        },
        emitSelection: () => {
          emitCalls++;
        },
        announce: () => {
          announceCalls++;
        },
      }),
    );

    expect(emitCalls).toBe(0);
    expect(commitZoomCalls).toBe(0);
    expect(announceCalls).toBe(0);
    expect(inspectionPanelCalls).toBe(0);
    expect(candidateSemanticKeysCalls).toBe(0);
    // Deriveds are lazy on client and server at the 5.33.1 floor, so this
    // guard proves the exposed accessors reach no armed getter (reads + one
    // flush below) — the construction-read discipline. Direct (non-derived)
    // construction-time reads of armed deps would throw right here.
    expect(state.committedInterval).toBeNull();
    expect(state.effectiveIntervals).toEqual([]);
    expect(state.effectiveIntervalKeys).toEqual([]);
    expect(state.currentIntervalTargetLabel).toBeUndefined();
    expect(state.boundsEditorInput).toBeNull();
    expect(state.boundsReturnFocus).toBeNull();
    expect(state.intervalBoundsTargetAvailable).toBe(true);
    flushSync();
    expect(emitCalls).toBe(0);
    expect(commitZoomCalls).toBe(0);
    expect(announceCalls).toBe(0);
    expect(inspectionPanelCalls).toBe(0);
    expect(candidateSemanticKeysCalls).toBe(0);
    destroy();
  });
});

describe("createIntervalState shared consumption bag", () => {
  it("uses sharedConsumptionCandidates and skips candidateSemanticKeys walk for non-union keys", () => {
    const model = modelFor(continuousSpec());
    const panelId = model.scene.panels[0]?.id;
    if (panelId === undefined) throw new Error("expected panel");
    let keyCalls = 0;
    const sharedBag = [
      {
        panelId,
        xValue: 1 as const,
        yValue: 1 as const,
        keys: ["0"] as const,
      },
      {
        panelId,
        xValue: 10 as const,
        yValue: 20 as const,
        keys: ["1"] as const,
      },
    ];
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: persistentSelect,
      candidateSemanticKeys: (candidate) => {
        keyCalls++;
        return identityCandidateKeys(candidate);
      },
      sharedConsumptionCandidates: () => sharedBag,
    });

    state.applyBrushSelectEnd(brushEvent(model, { keys: ["0", "1"] }), "pointer");
    flushSync();
    keyCalls = 0;
    const keys = state.effectiveIntervalKeys;
    expect(keys.length).toBeGreaterThan(0);
    // Shared bag supplied all candidates — no local full-store key walk.
    expect(keyCalls).toBe(0);

    destroy();
  });

  it("falls back to local walk when shared bag is null", () => {
    const model = modelFor(continuousSpec());
    let keyCalls = 0;
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: persistentSelect,
      candidateSemanticKeys: (candidate) => {
        keyCalls++;
        return identityCandidateKeys(candidate);
      },
      sharedConsumptionCandidates: () => null,
    });

    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();
    keyCalls = 0;
    expect(state.effectiveIntervalKeys.length).toBeGreaterThan(0);
    expect(keyCalls).toBeGreaterThan(0);

    destroy();
  });
});

describe("createIntervalState local mode", () => {
  it("applyBrushSelectEnd (persistent) commits record; clear empties and emits once; second clear is silent", () => {
    const model = modelFor(continuousSpec());
    const events: PlotSelection[] = [];
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: persistentSelect,
      emitSelection: (event) => {
        events.push(event);
      },
    });

    const brush = brushEvent(model);
    state.applyBrushSelectEnd(brush, "pointer");
    flushSync();

    const panelId = model.scene.panels[0]?.id;
    expect(panelId).toBeDefined();
    expect(state.committedInterval).not.toBeNull();
    expect(state.committedInterval?.panelId).toBe(panelId);
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.effectiveIntervals[0]?.panelId).toBe(panelId);
    expect(state.effectiveIntervals[0]?.domains.x?.kind).toBe("linear");
    // Public keys surface: literal keys from the event are stored.
    expect(state.effectiveIntervals[0]?.keys).toEqual(["0", "1"]);
    expect(state.effectiveIntervalKeys.length).toBeGreaterThan(0);
    // applyBrushSelectEnd never emits — host owns emission.
    expect(events).toEqual([]);

    state.clearIntervalSelection("pointer");
    flushSync();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "select",
      phase: "clear",
      mode: "xy",
      panelId,
      domain: {},
      keys: [],
      lineageCount: 0,
      source: "pointer",
    });
    expect(state.committedInterval).toBeNull();
    expect(state.effectiveIntervals).toEqual([]);
    expect(state.effectiveIntervalKeys).toEqual([]);

    events.length = 0;
    state.clearIntervalSelection("pointer");
    flushSync();
    expect(events).toEqual([]);

    destroy();
  });
});

describe("createIntervalState controller mode", () => {
  it("commits through setInterval; external clear/replace drops committedInterval pixel rect", () => {
    const model = modelFor(continuousSpec());
    const panelId = model.scene.panels[0]?.id;
    if (panelId === undefined) throw new Error("expected panel");
    const controller = createPlotInteraction();
    const interactionBox = reactiveBox<MaybeController>(controller);

    const { state, destroy } = mountIntervalController({
      model: () => model,
      interaction: () => interactionBox.value,
      selectConfig: persistentSelect,
    });

    const brush = brushEvent(model, { keys: ["k0"] });
    state.applyBrushSelectEnd(brush, "pointer");
    flushSync();
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.committedInterval).not.toBeNull();
    expect(controller.intervals(defaultScope)).toHaveLength(1);

    // External clear on the shared controller → reconcile drops pixel rect.
    controller.clearIntervals({ scope: defaultScope, source: "programmatic" });
    flushSync();
    expect(state.effectiveIntervals).toEqual([]);
    expect(state.committedInterval).toBeNull();

    // Re-commit, then same-panel replacement with different domains clears
    // the pixel rect via sameIntervalRecord gate.
    state.applyBrushSelectEnd(brush, "pointer");
    flushSync();
    expect(state.committedInterval).not.toBeNull();

    controller.setInterval(
      Object.freeze({
        panelId,
        preset: "independent" as const,
        domains: Object.freeze({
          x: Object.freeze({ kind: "linear" as const, domain: [1, 3] as const }),
        }),
        keys: Object.freeze(["other"]),
      }),
      { scope: defaultScope, source: "programmatic" },
    );
    flushSync();
    expect(state.committedInterval).toBeNull();
    // Record still present under the host (replacement, not clear).
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.effectiveIntervals[0]?.domains.x).toMatchObject({
      kind: "linear",
      domain: [1, 3],
    });

    destroy();
  });

  it("module clear paths write through the controller with the right scope and panel", () => {
    const model = modelFor(facetSpec());
    const north = model.scene.panels[0];
    const south = model.scene.panels[1];
    if (north === undefined || south === undefined) {
      throw new Error("expected two facet panels");
    }
    const controller = createPlotInteraction();
    const events: PlotSelection[] = [];

    const { state, destroy } = mountIntervalController({
      model: () => model,
      interaction: () => controller,
      selectConfig: persistentSelect,
      emitSelection: (event) => {
        events.push(event);
      },
    });

    state.applyBrushSelectEnd(
      brushEvent(model, {
        panelId: north.id,
        domain: { x: [0.5, 1.5], y: [0.5, 1.5] },
        keys: ["n"],
      }),
      "pointer",
    );
    state.applyBrushSelectEnd(
      brushEvent(model, {
        panelId: south.id,
        domain: { x: [1.5, 2.5], y: [1.5, 2.5] },
        keys: ["s"],
      }),
      "pointer",
    );
    flushSync();
    expect(controller.intervals(defaultScope)).toHaveLength(2);

    // clearCurrentPanelInterval → interaction.clearInterval(panelId): only
    // the current (south) record leaves the shared controller.
    events.length = 0;
    state.clearCurrentPanelInterval("pointer");
    flushSync();
    expect(controller.intervals(defaultScope)).toHaveLength(1);
    expect(controller.intervals(defaultScope)[0]?.panelId).toBe(north.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.panelId).toBe(south.id);

    // clearIntervalSelection → interaction.clearIntervals(scope): all gone.
    events.length = 0;
    state.clearIntervalSelection("keyboard");
    flushSync();
    expect(controller.intervals(defaultScope)).toEqual([]);
    expect(state.effectiveIntervals).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("clear");

    destroy();
  });
});

describe("createIntervalState clearCurrentPanelInterval", () => {
  it("clears only the target panel's record and emits once; no-op when nothing current", () => {
    const model = modelFor(facetSpec());
    const north = model.scene.panels[0];
    const south = model.scene.panels[1];
    if (north === undefined || south === undefined) {
      throw new Error("expected two facet panels");
    }
    const events: PlotSelection[] = [];

    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: persistentSelect,
      emitSelection: (event) => {
        // Write-before-emit (host order: null committed state, THEN emit) —
        // the sink must observe the already-cleared committed rect.
        if (event.phase === "clear") {
          expect(state.committedInterval).toBeNull();
        }
        events.push(event);
      },
    });

    state.applyBrushSelectEnd(
      brushEvent(model, {
        panelId: north.id,
        domain: { x: [0.5, 1.5], y: [0.5, 1.5] },
        keys: ["north"],
      }),
      "pointer",
    );
    state.applyBrushSelectEnd(
      brushEvent(model, {
        panelId: south.id,
        domain: { x: [1.5, 2.5], y: [1.5, 2.5] },
        keys: ["south"],
      }),
      "pointer",
    );
    flushSync();
    expect(state.effectiveIntervals).toHaveLength(2);
    // Last brush is current (committedInterval follows the latest end event).
    expect(state.committedInterval?.panelId).toBe(south.id);

    events.length = 0;
    state.clearCurrentPanelInterval("pointer");
    flushSync();
    expect(events).toHaveLength(1);
    expect(events[0]?.panelId).toBe(south.id);
    expect(events[0]?.phase).toBe("clear");
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.effectiveIntervals[0]?.panelId).toBe(north.id);
    expect(state.committedInterval).toBeNull();

    // After south is cleared, currentIntervalRecord falls back to the first
    // remaining record (north) — a second clearCurrentPanelInterval would
    // clear it. True no-op requires nothing current AND no residual records.
    state.clearIntervalSelection("programmatic");
    flushSync();
    events.length = 0;
    state.clearCurrentPanelInterval("pointer");
    flushSync();
    expect(events).toEqual([]);
    expect(state.effectiveIntervals).toEqual([]);

    destroy();
  });
});

describe("createIntervalState interval target availability", () => {
  it("panel loss flips intervalBoundsTargetAvailable false and labels the target unavailable", () => {
    const facetModel = modelFor(facetSpec());
    const north = facetModel.scene.panels[0];
    if (north === undefined) throw new Error("expected facet panel");
    const swappedModel = modelFor(continuousSpec());
    // Precondition for the swap below: the replacement model must not reuse
    // the facet panel's id, or the lookup would still succeed.
    expect(swappedModel.scene.panels[0]?.id).not.toBe(north.id);
    const modelBox = reactiveBox<RenderModel | null>(facetModel);

    const { state, destroy } = mountIntervalController({
      model: () => modelBox.value,
      selectConfig: persistentSelect,
    });

    state.applyBrushSelectEnd(
      brushEvent(facetModel, {
        panelId: north.id,
        domain: { x: [0.5, 1.5], y: [0.5, 1.5] },
        keys: ["north"],
      }),
      "pointer",
    );
    flushSync();
    // Record present and its panel exists → target available, facet label.
    expect(state.intervalBoundsTargetAvailable).toBe(true);
    expect(state.currentIntervalTargetLabel).toContain("North");

    // Swap to a model without that panel: the LOCAL record survives (records
    // are model-independent), but the panel lookup now fails — ToolRail must
    // see the precise-bounds target as unavailable.
    modelBox.set(swappedModel);
    flushSync();
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.intervalBoundsTargetAvailable).toBe(false);
    expect(state.currentIntervalTargetLabel).toBe("unavailable panel");

    destroy();
  });
});

describe("createIntervalState semanticAxis (public behavior)", () => {
  it("band commit stores encoded band values; axis-less early-return still sets committedInterval", () => {
    const bandModel = modelFor(bandXSpec());
    const panelId = bandModel.scene.panels[0]?.id;
    if (panelId === undefined) throw new Error("expected panel");
    const { state, destroy } = mountIntervalController({
      model: () => bandModel,
      selectConfig: persistentSelect,
    });

    state.applyBrushSelectEnd(
      brushEvent(bandModel, {
        domain: {
          x: ["north", "south"],
          y: [0, 20],
        },
        keys: ["0", "1"],
      }),
      "pointer",
    );
    flushSync();
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(state.effectiveIntervals[0]?.domains.x).toMatchObject({
      kind: "band",
      values: [encodeKey("north"), encodeKey("south")],
    });

    // Empty/axis-less: domain with unmappable bounds → private commit early-
    // returns (no record, no throw). applyBrushSelectEnd still writes
    // committedInterval first (host 1796 order) — pin that synchronous write
    // before the reconcile effect (which drops the pixel rect when no record
    // backs it) has a chance to run.
    state.clearIntervalSelection("programmatic");
    flushSync();
    const axisless = buildIntervalSelection({
      phase: "end",
      mode: "xy",
      panelId,
      domain: {},
      pixels: { x0: 0, y0: 0, x1: 10, y1: 10 },
      keys: [],
      lineageCount: 0,
      source: "pointer",
    });
    state.applyBrushSelectEnd(axisless, "pointer");
    expect(state.committedInterval).not.toBeNull();
    expect(state.committedInterval?.panelId).toBe(panelId);
    expect(state.effectiveIntervals).toEqual([]);
    flushSync();
    // Reconcile effect: no semantic record → drop the pixel rect.
    expect(state.committedInterval).toBeNull();

    destroy();
  });
});

describe("createIntervalState bounds editor select path", () => {
  it("band precise-bounds emit typed domain endpoints from encoded identities", () => {
    // semanticAxis stores encodeKey tokens; eventDomain must decode them back
    // to typed rawDomain values for the public IntervalSelection.domain payload.
    const bandModel = modelFor(bandXSpec());
    const events: PlotSelection[] = [];
    const trigger = document.createElement("button");
    const { state, destroy } = mountIntervalController({
      model: () => bandModel,
      selectConfig: persistentSelect,
      emitSelection: (event) => {
        events.push(event);
      },
    });

    state.applyBrushSelectEnd(
      brushEvent(bandModel, {
        domain: { x: ["north", "south"], y: [0, 20] },
        keys: ["0", "1"],
      }),
      "pointer",
    );
    flushSync();
    expect(state.effectiveIntervals[0]?.domains.x).toMatchObject({
      kind: "band",
      values: [encodeKey("north"), encodeKey("south")],
    });

    state.openBoundsEditor("select", "x", trigger);
    flushSync();
    expect(state.boundsEditorInput?.scale).toBe("band");

    events.length = 0;
    state.applyPreciseBounds({
      source: "precise-bounds",
      inputSource: "keyboard",
      action: "select",
      axis: "x",
      reversed: false,
      scale: "band",
      bounds: ["north", "south"],
    });
    flushSync();
    expect(events).toHaveLength(1);
    const endEvent = events[0];
    expect(endEvent !== undefined && "domain" in endEvent ? endEvent.domain.x : undefined).toEqual([
      "north",
      "south",
    ]);
    // Missing / partial endpoints still project pixels from the resolved band span.
    expect(state.committedInterval).not.toBeNull();
    expect(state.committedInterval?.pixels.x1).toBeGreaterThan(
      state.committedInterval?.pixels.x0 ?? 0,
    );

    destroy();
  });

  it("open → input; apply updates record (persistent) and emits once; non-persistent emits without record", () => {
    const model = modelFor(continuousSpec());
    const events: PlotSelection[] = [];
    const selectBox = reactiveBox<SelectConfig>(persistentSelect());
    const trigger = document.createElement("button");

    let assertWriteBeforeEmit = true;
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: () => selectBox.value,
      emitSelection: (event) => {
        // Write-before-emit (precise-bounds end path, persistent): committed
        // interval is already updated when the sink observes the end event.
        if (assertWriteBeforeEmit && event.phase === "end") {
          expect(state.committedInterval).not.toBeNull();
        }
        events.push(event);
      },
    });

    // Seed a committed interval so the select bounds editor has a record.
    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();

    state.openBoundsEditor("select", "x", trigger);
    flushSync();
    expect(state.boundsReturnFocus).toBe(trigger);
    expect(state.boundsEditorInput).not.toBeNull();
    expect(state.boundsEditorInput?.action).toBe("select");
    expect(state.boundsEditorInput?.axis).toBe("x");
    expect(state.boundsEditorInput?.scale).not.toBe("band");

    events.length = 0;
    const priorX = state.effectiveIntervals[0]?.domains.x;
    expect(priorX?.kind).toBe("linear");
    state.applyPreciseBounds({
      source: "precise-bounds",
      inputSource: "keyboard",
      action: "select",
      axis: "x",
      reversed: false,
      scale: "linear",
      bounds: [3, 7],
    });
    flushSync();
    expect(events).toHaveLength(1);
    const endEvent = events[0];
    expect(endEvent?.phase).toBe("end");
    // IntervalSelection is the only PlotSelection variant with `domain`.
    expect(endEvent !== undefined && "domain" in endEvent ? endEvent.domain.x : undefined).toEqual([
      3, 7,
    ]);
    expect(state.effectiveIntervals[0]?.domains.x).toMatchObject({
      kind: "linear",
      domain: [3, 7],
    });
    expect(state.boundsEditorInput).toBeNull();
    expect(state.committedInterval).not.toBeNull();

    // Non-persistent: event emitted, no durable record.
    state.clearIntervalSelection("programmatic");
    flushSync();
    events.length = 0;
    selectBox.set(nonPersistentSelect());
    flushSync();
    assertWriteBeforeEmit = false;
    state.openBoundsEditor("select", "x", trigger);
    flushSync();
    expect(state.boundsEditorInput).not.toBeNull();
    state.applyPreciseBounds({
      source: "precise-bounds",
      inputSource: "keyboard",
      action: "select",
      axis: "x",
      reversed: false,
      scale: "linear",
      bounds: [4, 6],
    });
    flushSync();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("end");
    expect(state.effectiveIntervals).toEqual([]);
    expect(state.committedInterval).toBeNull();

    destroy();
  });
});

describe("createIntervalState bounds editor zoom path", () => {
  it("open uses effectiveZoomDomains ?? scale.domain; apply calls commitZoom; band → null input", () => {
    const model = modelFor(continuousSpec());
    const zoomDomains = reactiveBox<ContinuousZoomDomains | null>({ x: [2, 8] });
    const commits: { domains: ContinuousZoomDomains | null; source: InteractionSource }[] = [];
    const trigger = document.createElement("button");

    const { state, destroy } = mountIntervalController({
      model: () => model,
      effectiveZoomDomains: () => zoomDomains.value,
      commitZoom: (domains, source) => {
        commits.push({ domains, source });
      },
    });

    state.openBoundsEditor("zoom", "x", trigger);
    flushSync();
    expect(state.boundsEditorInput).not.toBeNull();
    expect(state.boundsEditorInput?.action).toBe("zoom");
    expect(state.boundsEditorInput?.bounds).toEqual([2, 8]);

    state.applyPreciseBounds({
      source: "precise-bounds",
      inputSource: "keyboard",
      action: "zoom",
      axis: "x",
      reversed: false,
      scale: "linear",
      bounds: [3, 9],
    });
    flushSync();
    expect(commits).toHaveLength(1);
    expect(commits[0]?.domains).toEqual({ x: [3, 9] });
    expect(commits[0]?.source).toBe("keyboard");
    expect(state.boundsEditorInput).toBeNull();

    // Band scale → zoom bounds editor input is null.
    const bandModel = modelFor(bandXSpec());
    const modelBox = reactiveBox<RenderModel | null>(bandModel);
    destroy();
    const second = mountIntervalController({
      model: () => modelBox.value,
    });
    second.state.openBoundsEditor("zoom", "x", trigger);
    flushSync();
    expect(second.state.boundsEditorInput).toBeNull();
    second.destroy();
  });
});

describe("createIntervalState bounds-cancel effect", () => {
  it("closes editor and focuses captureSurface when the target panel disappears", async () => {
    const facet = modelFor(facetSpec());
    const southOnly = modelFor(
      gg([{ id: "south", facet: "South", x: 2, y: 2 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .facet({ wrap: "facet" })
        .spec(),
    );
    const modelBox = reactiveBox<RenderModel | null>(facet);
    const surface = document.createElement("div");
    surface.tabIndex = -1;
    document.body.append(surface);
    const announcements: string[] = [];
    const trigger = document.createElement("button");

    const { state, destroy } = mountIntervalController({
      model: () => modelBox.value,
      captureSurface: () => surface,
      announce: (message) => {
        announcements.push(message);
      },
    });

    const north = facet.scene.panels[0];
    if (north === undefined) throw new Error("expected north panel");
    state.applyBrushSelectEnd(
      brushEvent(facet, {
        panelId: north.id,
        domain: { x: [0.5, 1.5], y: [0.5, 1.5] },
        keys: ["north"],
      }),
      "pointer",
    );
    flushSync();
    state.openBoundsEditor("select", "x", trigger);
    flushSync();
    expect(state.boundsEditorInput).not.toBeNull();
    expect(state.boundsReturnFocus).toBe(trigger);

    // Drop the North panel — editor target no longer available.
    modelBox.set(southOnly);
    flushSync();
    expect(state.boundsEditorInput).toBeNull();
    expect(state.boundsReturnFocus).toBeNull();

    // Cancellation announcement + focus run in a microtask.
    await Promise.resolve();
    expect(announcements.some((m) => m.includes("cancelled"))).toBe(true);
    expect(document.activeElement).toBe(surface);

    surface.remove();
    destroy();
  });
});

describe("createIntervalState write-before-emit", () => {
  it("clearIntervalSelection: committedInterval is already null when emitSelection runs", () => {
    const model = modelFor(continuousSpec());
    let observedAtEmit: IntervalSelection | null | undefined = "unset" as never;
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: persistentSelect,
      emitSelection: () => {
        observedAtEmit = state.committedInterval;
      },
    });

    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();
    expect(state.committedInterval).not.toBeNull();

    state.clearIntervalSelection("pointer");
    expect(observedAtEmit).toBeNull();
    expect(state.committedInterval).toBeNull();

    destroy();
  });
});

describe("createIntervalState applyBrushSelectEnd", () => {
  it("persistent sets committed + record; non-persistent nulls committed; method never emits", () => {
    const model = modelFor(continuousSpec());
    const events: PlotSelection[] = [];
    const selectBox = reactiveBox<SelectConfig>(persistentSelect());

    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: () => selectBox.value,
      emitSelection: (event) => {
        events.push(event);
      },
    });

    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();
    expect(state.committedInterval).not.toBeNull();
    expect(state.effectiveIntervals).toHaveLength(1);
    expect(events).toEqual([]);

    state.clearIntervalSelection("programmatic");
    flushSync();
    events.length = 0;

    selectBox.set(nonPersistentSelect());
    flushSync();
    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();
    expect(state.committedInterval).toBeNull();
    expect(state.effectiveIntervals).toEqual([]);
    expect(events).toEqual([]);

    destroy();
  });
});

describe("createIntervalState selectConfig replacement", () => {
  it("flipping persistent post-flush is honored by the next applyBrushSelectEnd", () => {
    const model = modelFor(continuousSpec());
    const selectBox = reactiveBox<SelectConfig>(persistentSelect());
    const { state, destroy } = mountIntervalController({
      model: () => model,
      selectConfig: () => selectBox.value,
    });

    state.applyBrushSelectEnd(brushEvent(model), "pointer");
    flushSync();
    expect(state.effectiveIntervals).toHaveLength(1);

    state.clearIntervalSelection("programmatic");
    flushSync();
    selectBox.set(nonPersistentSelect());
    flushSync();

    state.applyBrushSelectEnd(brushEvent(model), "keyboard");
    flushSync();
    expect(state.committedInterval).toBeNull();
    expect(state.effectiveIntervals).toEqual([]);

    // Flip back to persistent.
    selectBox.set(persistentSelect());
    flushSync();
    state.applyBrushSelectEnd(brushEvent(model), "keyboard");
    flushSync();
    expect(state.committedInterval).not.toBeNull();
    expect(state.effectiveIntervals).toHaveLength(1);

    destroy();
  });
});
