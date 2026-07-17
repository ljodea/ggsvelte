/**
 * Legend-focus controller unit + integration tests (S3 extraction).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { runPipeline, type RenderModel } from "@ggsvelte/core";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import GGPlot from "../src/lib/GGPlot.svelte";
import type { LegendFocusEvent, PlotInteractionScope } from "../src/lib/interaction.js";
import { createPlotInteraction } from "../src/lib/interaction-controller.svelte.js";
import { createLegendFocusState } from "../src/lib/legend-focus-state.svelte.js";
import { createPlotRuntime, type PlotRuntime } from "../src/lib/plot-runtime.svelte.js";
import { createSourceIdentityTracker } from "../src/lib/plot-semantic-keys.js";
import {
  createSemanticKeyService,
  type SemanticKeyService,
} from "../src/lib/plot-shared-services.svelte.js";
import type { InteractiveLegendEntry } from "../src/lib/plot-legend-focus.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";
import { createReactiveRuntimeDeps } from "./helpers/runtime-deps.svelte.js";
import { render } from "./helpers/render.js";
import { until } from "./helpers/until.js";

const focusRows = [
  { id: "a", x: 1, y: 1, group: "north" },
  { id: "b", x: 2, y: 2, group: "south" },
  { id: "c", x: 3, y: 3, group: "north" },
];

type FocusCb = ((event: LegendFocusEvent) => void) | undefined;
const noCallback = (): FocusCb => undefined;

type MaybeController = ReturnType<typeof createPlotInteraction<PropertyKey>> | undefined;
/** Getter that supplies no interaction controller (chart-local mode). */
const noController = (): MaybeController => undefined;

const defaultScope: PlotInteractionScope = { keys: "plot" };

function colorSpec(
  data: readonly { id: string; x: number; y: number; group: string }[] = focusRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y", color: "group" }))
    .geomPoint()
    .spec();
}

function modelFor(spec: PortableSpec): RenderModel {
  return runPipeline(spec, { width: 360, height: 260 });
}

function clickEvent(detail = 1): MouseEvent {
  return new MouseEvent("click", { bubbles: true, detail });
}

function keyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, bubbles: true });
}

type FocusHarness = {
  state: ReturnType<typeof createLegendFocusState>;
  model: RenderModel;
  semanticKeys: SemanticKeyService;
  entries: () => readonly InteractiveLegendEntry[];
  destroy: () => void;
};

function mountFocusController(options: {
  model?: RenderModel;
  interaction?: ReturnType<typeof createPlotInteraction<PropertyKey>> | undefined;
  legendFocusEnabled?: boolean;
  legendFocusPreviewEnabled?: boolean;
  onlegendfocus?: FocusCb;
  oninteraction?: FocusCb;
  announce?: (message: string) => void;
  root?: HTMLDivElement | null;
  registerEffects?: boolean;
}): FocusHarness {
  const model = options.model ?? modelFor(colorSpec());
  const enabled = reactiveBox(options.legendFocusEnabled ?? true);
  const previewEnabled = reactiveBox(options.legendFocusPreviewEnabled ?? true);
  const interactionBox = reactiveBox(options.interaction);
  const focusCb = reactiveBox<FocusCb>(options.onlegendfocus);
  const interactionCb = reactiveBox<FocusCb>(options.oninteraction);
  const rootBox = reactiveBox<HTMLDivElement | null>(options.root ?? null);
  const tracker = createSourceIdentityTracker();
  const data = focusRows;

  const { value, destroy } = withFlushedEffectRoot(() => {
    const semanticKeys = createSemanticKeyService({
      model: () => model,
      assembled: () => colorSpec(),
      datumKey: () => "id",
      data: () => data,
      spec: () => null,
      sourceIdentity: (v) => tracker.sourceIdentity(v),
      deliverDiagnostic: () => {},
    });
    let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
    const controller = createLegendFocusState({
      model: () => model,
      interaction: () => interactionBox.value,
      resolvedInteractionScope: () => defaultScope,
      legendFocusEnabled: () => enabled.value,
      legendFocusPreviewEnabled: () => previewEnabled.value,
      root: () => rootBox.value,
      semanticKeys: () => semanticKeys,
      entries: () => entriesRef(),
      onlegendfocus: () => focusCb.value,
      oninteraction: () => interactionCb.value,
      announce: options.announce ?? (() => {}),
    });
    entriesRef = () => controller.computeInteractiveEntries(model);
    if (options.registerEffects !== false) controller.registerReconcileEffects();
    return {
      controller,
      semanticKeys,
      entriesRef,
      enabled,
      previewEnabled,
      focusCb,
      interactionCb,
      rootBox,
    };
  });

  return {
    state: value.controller,
    model,
    semanticKeys: value.semanticKeys,
    entries: () => value.entriesRef(),
    destroy,
  };
}

describe("createLegendFocusState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let modelCalls = 0;
    let semanticCalls = 0;
    let entriesCalls = 0;
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withEffectRoot(() =>
      createLegendFocusState({
        model: () => {
          modelCalls++;
          return null;
        },
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => {
          semanticCalls++;
          return {
            legendEntryKeyIndex: new Map(),
            keysForLegend: () => [],
          };
        },
        entries: () => {
          entriesCalls++;
          return [];
        },
        onlegendfocus: noCallback,
        oninteraction: noCallback,
        announce: () => {},
      }),
    );

    expect(modelCalls).toBe(0);
    expect(semanticCalls).toBe(0);
    expect(entriesCalls).toBe(0);
    // Client deriveds are lazy, so the construction-time assertion alone
    // cannot catch a model-reading $derived added to the factory. Force
    // every exposed accessor and one effect flush, then re-assert — that is
    // the closest client-side stand-in for Svelte 5.29's SSR behavior,
    // where such a derived evaluates eagerly at construction (TDZ hazard).
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(state.previewIdentity).toBeNull();
    expect(state.rovingIndex).toBe(0);
    flushSync();
    expect(modelCalls).toBe(0);
    expect(semanticCalls).toBe(0);
    expect(entriesCalls).toBe(0);
    // Silence unused tracker (pattern mirrors semantic-service tests).
    void tracker;
    destroy();
  });
});

describe("createLegendFocusState preview → commit cycle", () => {
  it("keyboard focus previews then Enter commits with literal payload", () => {
    const events: LegendFocusEvent[] = [];
    const announcements: string[] = [];
    const { state, model, destroy } = mountFocusController({
      onlegendfocus: (event) => {
        events.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    const entries = state.computeInteractiveEntries(model);
    expect(entries).toHaveLength(2);
    const northIndex = entries.findIndex((entry) => entry.entry.value === "north");
    expect(northIndex).toBeGreaterThanOrEqual(0);

    state.onLegendFocus(northIndex);
    flushSync();

    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    expect(state.previewIdentity).toEqual({ scale: "color", entryIndex: northIndex });
    expect(events).toEqual([
      {
        type: "legend-focus",
        phase: "change",
        state: "transient",
        source: "keyboard",
        scale: "color",
        value: "north",
        label: expect.any(String) as string,
        keys: ["a", "c"],
      },
    ]);
    // Focus preview source is "focus" → maps to keyboard InteractionSource.
    expect(events[0]).toMatchObject({
      phase: "change",
      state: "transient",
      scale: "color",
      value: "north",
      keys: ["a", "c"],
    });
    expect(announcements.at(-1)).toMatch(/previewed/);

    state.onLegendKeydown(keyEvent("Enter"), northIndex);
    flushSync();

    const committed = events.filter(
      (event) => event.phase === "change" && event.state === "committed",
    );
    expect(committed).toHaveLength(1);
    expect(committed[0]).toMatchObject({
      type: "legend-focus",
      phase: "change",
      state: "committed",
      source: "keyboard",
      scale: "color",
      value: "north",
      keys: ["a", "c"],
    });
    expect(state.previewIdentity).toBeNull();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    expect(state.computeLegendPressed(model)).toEqual({
      scale: "color",
      entryIndex: northIndex,
    });
    expect(announcements.at(-1)).toMatch(/focused/);

    destroy();
  });
});

describe("createLegendFocusState local vs controller emphasis", () => {
  it("local mode: commit writes local keys; clear empties them and emits", () => {
    const events: LegendFocusEvent[] = [];
    const { state, model, destroy } = mountFocusController({
      interaction: undefined,
      onlegendfocus: (event) => {
        events.push(event);
      },
    });

    const northIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);

    state.clearLegendFocus("keyboard");
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(events.filter((event) => event.phase === "clear")).toEqual([
      { type: "legend-focus", phase: "clear", source: "keyboard" },
    ]);

    destroy();
  });

  it("controller mode: local keys untouched; revision drives emphasis recompute", () => {
    const controller = createPlotInteraction();
    const interactionBox = reactiveBox(controller);
    const revisionDriver = reactiveBox(0);
    const model = modelFor(colorSpec());
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => model,
        assembled: () => colorSpec(),
        datumKey: () => "id",
        data: () => focusRows,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => model,
        // Re-read revision via reactive box so effectiveEmphasisKeys tracks it.
        interaction: () => {
          void revisionDriver.value;
          return interactionBox.value;
        },
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: noCallback,
        oninteraction: noCallback,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(model);
      focus.registerReconcileEffects();
      return focus;
    });

    expect(state.effectiveEmphasisKeys).toEqual([]);
    controller.setEmphasis(["b"], { scope: defaultScope, source: "programmatic" });
    revisionDriver.set(controller.revision);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);

    // Committing an UNPRESSED entry writes THROUGH to the controller
    // (commitLegend calls interaction.setEmphasis) — local keys never used.
    const northIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    revisionDriver.set(controller.revision);
    flushSync();
    expect(controller.emphasized(defaultScope)).toEqual(["a", "c"]);
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);

    // Clicking the now-pressed entry is a toggle-clear: clearEmphasis on the
    // controller, not a local mutation.
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    revisionDriver.set(controller.revision);
    flushSync();
    expect(controller.emphasized(defaultScope)).toEqual([]);
    expect(state.effectiveEmphasisKeys).toEqual([]);

    destroy();
  });
});

describe("createLegendFocusState roving focus reconcile", () => {
  it("entry count shrink relocates roving index and queues refocus", async () => {
    const both = focusRows;
    const onlyNorth = [focusRows[0], focusRows[2]];
    const dataBox = reactiveBox(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const root = document.createElement("div");
    document.body.append(root);

    const tracker = createSourceIdentityTracker();
    const { value, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => colorSpec(dataBox.value),
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => modelBox.value,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => root,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: noCallback,
        oninteraction: noCallback,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(modelBox.value);
      focus.registerReconcileEffects();
      return focus;
    });

    // Mount two real legend targets so refocus has a destination.
    const paintTargets = (count: number) => {
      root.replaceChildren();
      for (let i = 0; i < count; i++) {
        const btn = document.createElement("button");
        btn.className = "gg-legend-target";
        btn.dataset["ggLegendTarget"] = "";
        btn.dataset["ggLegendTarget"] = "";
        btn.dataset["index"] = String(i);
        btn.tabIndex = i === value.rovingIndex ? 0 : -1;
        root.append(btn);
      }
    };
    paintTargets(2);
    const south = root.querySelector<HTMLElement>('[data-index="1"]')!;
    south.focus();
    value.moveLegendFocus(0, "End");
    flushSync();
    expect(value.rovingIndex).toBe(1);
    expect(document.activeElement).toBe(south);

    dataBox.set(onlyNorth);
    modelBox.set(modelFor(colorSpec(onlyNorth)));
    paintTargets(1);
    // Keep focus on a target that still has data-gg-legend-target but out-of-range index.
    const stale = document.createElement("button");
    stale.dataset["ggLegendTarget"] = "";
    stale.dataset["index"] = "1";
    root.append(stale);
    stale.focus();
    flushSync();

    await until(() => value.rovingIndex === 0);
    await until(
      () =>
        document.activeElement ===
        root.querySelector<HTMLElement>('[data-gg-legend-target][data-index="0"]'),
    );
    expect(value.rovingIndex).toBe(0);

    destroy();
    root.remove();
  });
});

describe("createLegendFocusState committed-reconcile", () => {
  it("catalog reshuffle drops committed identity with a single programmatic clear", () => {
    const both = focusRows;
    const onlySouth = [focusRows[1]];
    const dataBox = reactiveBox(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const events: LegendFocusEvent[] = [];
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => colorSpec(dataBox.value),
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => modelBox.value,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(modelBox.value);
      focus.registerReconcileEffects();
      return focus;
    });

    const northIndex = state
      .computeInteractiveEntries(modelBox.value)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    const afterCommit = events.length;

    dataBox.set(onlySouth);
    modelBox.set(modelFor(colorSpec(onlySouth)));
    flushSync();

    expect(state.effectiveEmphasisKeys).toEqual([]);
    const clears = events.slice(afterCommit).filter((event) => event.phase === "clear");
    expect(clears).toHaveLength(1);
    expect(clears[0]).toEqual({
      type: "legend-focus",
      phase: "clear",
      source: "programmatic",
    });

    destroy();
  });
});

describe("createLegendFocusState preview-reconcile", () => {
  it("reshuffle remaps preview keys in place and clears when entry disappears", () => {
    const both = focusRows;
    // Same two groups, different row membership for north (drop c).
    const remapped = [focusRows[0], focusRows[1]];
    const onlySouth = [focusRows[1]];
    const dataBox = reactiveBox(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const events: LegendFocusEvent[] = [];
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => colorSpec(dataBox.value),
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => modelBox.value,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(modelBox.value);
      focus.registerReconcileEffects();
      return focus;
    });

    const northIndex = state
      .computeInteractiveEntries(modelBox.value)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendFocus(northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    const afterPreview = events.length;

    // Remap north keys in place (no event).
    dataBox.set(remapped);
    modelBox.set(modelFor(colorSpec(remapped)));
    flushSync();
    expect(state.previewIdentity).not.toBeNull();
    expect(state.effectiveEmphasisKeys).toEqual(["a"]);
    expect(events.slice(afterPreview)).toEqual([]);

    // Preview reconcile matches POSITIONALLY (scale + entryIndex): dropping
    // north makes south inherit entryIndex 0, so the preview remaps onto
    // south's keys rather than clearing (reconcileLegendPreview semantics).
    dataBox.set(onlySouth);
    modelBox.set(modelFor(colorSpec(onlySouth)));
    flushSync();
    expect(state.previewIdentity).toEqual({ scale: "color", entryIndex: 0 });
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);

    // A preview whose entryIndex disappears IS cleared: preview south
    // (entryIndex 1 after restoring both groups), then shrink to one entry.
    dataBox.set(both);
    modelBox.set(modelFor(colorSpec(both)));
    flushSync();
    const southIndex = state
      .computeInteractiveEntries(modelBox.value)
      .findIndex((entry) => entry.entry.value === "south");
    state.onLegendFocus(southIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);
    const beforeDrop = events.length;

    const onlyNorth = [focusRows[0], focusRows[2]];
    dataBox.set(onlyNorth);
    modelBox.set(modelFor(colorSpec(onlyNorth)));
    flushSync();
    expect(state.previewIdentity).toBeNull();
    expect(state.effectiveEmphasisKeys).toEqual([]);
    // Dismiss with no committed emphasis emits a clear; focus maps to keyboard.
    expect(events.slice(beforeDrop)).toEqual([
      { type: "legend-focus", phase: "clear", source: "keyboard" },
    ]);

    destroy();
  });
});

describe("createLegendFocusState focus-disabled effect", () => {
  it("flipping legendFocus off clears committed/local with one programmatic clear (committed-reconcile)", () => {
    const enabled = reactiveBox(true);
    const events: LegendFocusEvent[] = [];
    const model = modelFor(colorSpec());
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => model,
        assembled: () => colorSpec(),
        datumKey: () => "id",
        data: () => focusRows,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => model,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => enabled.value,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(model);
      focus.registerReconcileEffects();
      return focus;
    });

    const northIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    const afterCommit = events.length;

    enabled.set(false);
    flushSync();

    // Disabling gates entries to []: the committed-reconcile effect sees the
    // committed entry vanish with local emphasis active and takes its
    // clear-committed-local-emit branch (ONE programmatic clear). The
    // focus-disabled plan then finds nothing left and no-ops.
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(state.previewIdentity).toBeNull();
    expect(state.computeLegendPressed(model)).toBeNull();
    expect(events.slice(afterCommit)).toEqual([
      { type: "legend-focus", phase: "clear", source: "programmatic" },
    ]);

    destroy();
  });
});

describe("createLegendFocusState suppress interplay", () => {
  it("touch pointerdown → pointerup commits once and suppresses synthetic click", () => {
    const events: LegendFocusEvent[] = [];
    const { state, model, destroy } = mountFocusController({
      onlegendfocus: (event) => {
        events.push(event);
      },
    });

    const southIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "south");

    state.onLegendPointerDown(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }),
      southIndex,
    );
    state.onLegendPointerUp(
      new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }),
      southIndex,
    );
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);
    const commits = events.filter(
      (event) => event.phase === "change" && event.state === "committed",
    );
    expect(commits).toHaveLength(1);
    expect(commits[0]?.source).toBe("touch");

    // Synthetic click after touch must not double-commit (toggle-clear).
    state.onLegendClick(clickEvent(1), southIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);
    expect(
      events.filter((event) => event.phase === "change" && event.state === "committed"),
    ).toHaveLength(1);

    destroy();
  });

  it("clear-from-control with touch sets suppressLegendFocusPreview around refocus", async () => {
    const events: LegendFocusEvent[] = [];
    const root = document.createElement("div");
    document.body.append(root);
    const btn = document.createElement("button");
    btn.className = "gg-legend-target";
    btn.setAttribute("aria-pressed", "true");
    root.append(btn);

    const { state, model, destroy } = mountFocusController({
      root,
      onlegendfocus: (event) => {
        events.push(event);
      },
    });

    const northIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);

    // Production path: the refocus microtask calls returnTarget.focus(),
    // which fires the focus event SYNCHRONOUSLY while the suppress flag is
    // up — wire the same listener the markup wires.
    btn.addEventListener("focus", () => {
      state.onLegendFocus(northIndex);
    });

    state.setClearPointerType("touch");
    state.clearLegendFromControl(clickEvent(1));
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual([]);
    const clearEventCount = events.length;
    expect(events.at(-1)).toEqual({
      type: "legend-focus",
      phase: "clear",
      source: "touch",
    });

    await until(() => document.activeElement === btn);
    flushSync();
    // The synchronous refocus preview was suppressed: no preview event, no
    // emphasis resurrection.
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(events.length).toBe(clearEventCount);

    // The suppress window closes with the microtask: a LATER focus preview
    // works again (the feature is suppressed once, not disabled).
    state.onLegendFocus(northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);

    destroy();
    root.remove();
  });
});

describe("runtime + legend-focus real cycle", () => {
  it("commit changes emphasis; data drop delivers retrained model + single programmatic clear", () => {
    const events: LegendFocusEvent[] = [];
    const renders: RenderModel[] = [];
    const both = focusRows;
    const onlySouth = [focusRows[1]];
    const initialSpec = colorSpec(both);
    const tracker = createSourceIdentityTracker();

    const { value, destroy } = withFlushedEffectRoot(() => {
      const runtimeDeps = createReactiveRuntimeDeps({
        assembled: initialSpec,
        effectiveSpec: initialSpec,
      });
      // Host wiring: focus controller after enablement cluster; model via
      // getter over later runtime (never at construction).
      let runtimeRef: PlotRuntime | null = null;
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      let semanticKeysRef: SemanticKeyService | null = null;
      const focus = createLegendFocusState({
        model: () => runtimeRef?.model ?? null,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeysRef!,
        entries: () => entriesRef(),
        onlegendfocus: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
      });
      const runtime = createPlotRuntime({
        ...runtimeDeps,
        effectiveLegendFilters: () => [],
      });
      runtimeRef = runtime;
      const semanticKeys = createSemanticKeyService({
        model: () => runtime.model,
        assembled: () => runtimeDeps.assembled(),
        datumKey: () => "id",
        data: () => both,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      semanticKeysRef = semanticKeys;
      entriesRef = () => focus.computeInteractiveEntries(runtime.model);
      // Host registration order: model -> catalog(S2) -> reconcile(S3) -> late.
      runtime.registerModelEffects();
      focus.registerReconcileEffects();
      runtime.registerLateEffects();
      runtimeDeps.setOnrender((model) => {
        renders.push(model);
      });
      return { runtime, focus, runtimeDeps };
    });

    const { runtime, focus, runtimeDeps } = value;
    expect(runtime.model).not.toBeNull();

    const northIndex = focus
      .computeInteractiveEntries(runtime.model)
      .findIndex((entry) => entry.entry.value === "north");
    focus.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(focus.effectiveEmphasisKeys).toEqual(["a", "c"]);
    const afterCommitEvents = events.length;
    const afterCommitRenders = renders.length;

    const nextSpec = colorSpec(onlySouth);
    runtimeDeps.setAssembled(nextSpec);
    runtimeDeps.setEffectiveSpec(nextSpec);
    flushSync();

    expect(runtime.model).not.toBeNull();
    expect(runtime.model!.candidates.size).toBe(1);
    expect(renders.length).toBeGreaterThan(afterCommitRenders);
    expect(renders.at(-1)?.candidates.size).toBe(1);
    expect(focus.effectiveEmphasisKeys).toEqual([]);
    const clears = events.slice(afterCommitEvents).filter((event) => event.phase === "clear");
    expect(clears).toHaveLength(1);
    expect(clears[0]).toEqual({
      type: "legend-focus",
      phase: "clear",
      source: "programmatic",
    });

    destroy();
  });
});

describe("GGPlot legend keyboard cycle (markup rewire)", () => {
  it("focus → arrow → Enter → clear control works end-to-end", async () => {
    const events: LegendFocusEvent[] = [];
    const view = render(GGPlot, {
      data: focusRows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      key: "id",
      legendFocus: true,
      width: 360,
      height: 260,
      onlegendfocus: (event: LegendFocusEvent) => {
        events.push(event);
      },
    });
    await until(() => view.container.querySelectorAll(".gg-legend-target").length === 2);
    const targets = [...view.container.querySelectorAll<HTMLButtonElement>(".gg-legend-target")];
    const [north, south] = targets as [HTMLButtonElement, HTMLButtonElement];

    north.focus();
    await until(() =>
      events.some((event) => event.phase === "change" && event.state === "transient"),
    );
    north.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await until(() => document.activeElement === south);

    south.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() =>
      events.some((event) => event.phase === "change" && event.state === "committed"),
    );
    expect(south.getAttribute("aria-pressed")).toBe("true");
    expect(view.container.querySelector(".gg-legend-clear")).not.toBeNull();

    const clear = view.container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.click();
    await until(() => events.some((event) => event.phase === "clear"));
    expect(south.getAttribute("aria-pressed")).toBe("false");
    expect(view.container.querySelector(".gg-legend-clear")).toBeNull();
  });
});

describe("createLegendFocusState callback replacement", () => {
  it("replaces onlegendfocus AND oninteraction post-flush; each new callback receives the event", () => {
    const firstFocus: LegendFocusEvent[] = [];
    const firstInteraction: LegendFocusEvent[] = [];
    const secondFocus: LegendFocusEvent[] = [];
    const secondInteraction: LegendFocusEvent[] = [];
    const focusBox = reactiveBox<FocusCb>((event) => {
      firstFocus.push(event);
    });
    const interactionBox = reactiveBox<FocusCb>((event) => {
      firstInteraction.push(event);
    });
    const model = modelFor(colorSpec());
    const tracker = createSourceIdentityTracker();

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const semanticKeys = createSemanticKeyService({
        model: () => model,
        assembled: () => colorSpec(),
        datumKey: () => "id",
        data: () => focusRows,
        spec: () => null,
        sourceIdentity: (v) => tracker.sourceIdentity(v),
        deliverDiagnostic: () => {},
      });
      let entriesRef: () => readonly InteractiveLegendEntry[] = () => [];
      const focus = createLegendFocusState({
        model: () => model,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        semanticKeys: () => semanticKeys,
        entries: () => entriesRef(),
        onlegendfocus: () => focusBox.value,
        oninteraction: () => interactionBox.value,
        announce: () => {},
      });
      entriesRef = () => focus.computeInteractiveEntries(model);
      focus.registerReconcileEffects();
      return focus;
    });

    const northIndex = state
      .computeInteractiveEntries(model)
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(firstFocus).toHaveLength(1);
    expect(firstInteraction).toHaveLength(1);

    focusBox.set((event) => {
      secondFocus.push(event);
    });
    interactionBox.set((event) => {
      secondInteraction.push(event);
    });

    // Toggle-clear commit.
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(secondFocus).toHaveLength(1);
    expect(secondInteraction).toHaveLength(1);
    expect(secondFocus[0]).toEqual({
      type: "legend-focus",
      phase: "clear",
      source: "pointer",
    });
    expect(secondInteraction[0]).toEqual(secondFocus[0]);
    // Old callbacks must not receive the second event.
    expect(firstFocus).toHaveLength(1);
    expect(firstInteraction).toHaveLength(1);

    destroy();
  });
});
