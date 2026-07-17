/**
 * Point-selection controller tests (S8 extraction).
 * Factories own deriveds — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { CandidateFacts, RenderModel } from "@ggsvelte/core";
import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import type {
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../src/lib/interaction.js";
import { createPlotInteraction } from "../src/lib/interaction-controller.svelte.js";
import { buildPointSelectionEvent } from "../src/lib/plot-selection.js";
import {
  createSelectionState,
  type SelectionStateDeps,
} from "../src/lib/selection-state.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { modelFor } from "./helpers/model.js";
import { derivedBox, reactiveBox } from "./helpers/reactive-box.svelte.js";

const continuousRows = [
  { id: "a", x: 1, y: 1 },
  { id: "b", x: 10, y: 20 },
  { id: "c", x: 5, y: 8 },
];

type SelectConfig = ResolvedInteractionConfig["select"];
type MaybeController = ReturnType<typeof createPlotInteraction> | undefined;
type SelectCb = ((event: PlotSelection) => void) | undefined;
type InteractionCb = ((event: PlotInteractionEvent<Record<string, CellValue>>) => void) | undefined;

/** Getters that supply no callback (chart-local mode). */
const noSelectCb = (): SelectCb => undefined;
const noInteractionCb = (): InteractionCb => undefined;

const defaultScope: PlotInteractionScope = {
  keys: "plot",
  x: "x",
  y: "y",
  intervals: "plot",
};

const noController = (): MaybeController => undefined;
const noSelect = (): SelectCb => undefined;
const noInteraction = (): InteractionCb => undefined;

const pointSelectSingle = (): SelectConfig =>
  Object.freeze({
    type: "point" as const,
    multiple: false,
    persistent: true,
    preset: "independent" as const,
  });

const pointSelectMultiple = (): SelectConfig =>
  Object.freeze({
    type: "point" as const,
    multiple: true,
    persistent: true,
    preset: "independent" as const,
  });

function continuousSpec(
  data: readonly { id: string; x: number; y: number }[] = continuousRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y" }))
    .geomPoint()
    .spec();
}

/** Identity semantic keys from rowIndex — stable for anchor/mask tests. */
function identityCandidateKeys(candidate: CandidateFacts): PropertyKey[] {
  if (candidate.rowIndex === null) return [];
  return [String(candidate.rowIndex)];
}

type SelectionHarness = {
  state: ReturnType<typeof createSelectionState>;
  destroy: () => void;
};

function mountSelectionController(
  options: {
    model?: () => RenderModel | null;
    interaction?: () => MaybeController;
    resolvedInteractionScope?: () => PlotInteractionScope;
    selectConfig?: () => SelectConfig;
    effectiveIntervalKeys?: () => readonly PropertyKey[];
    effectiveEmphasisKeys?: () => readonly PropertyKey[];
    inspectionFocus?: SelectionStateDeps["inspectionFocus"];
    candidateSemanticKeys?: SelectionStateDeps["candidateSemanticKeys"];
    onselect?: () => SelectCb;
    oninteraction?: () => InteractionCb;
    announce?: (message: string) => void;
  } = {},
): SelectionHarness {
  const defaultModel = modelFor(continuousSpec());
  const { value: state, destroy } = withFlushedEffectRoot(() =>
    createSelectionState({
      model: options.model ?? (() => defaultModel),
      interaction: options.interaction ?? noController,
      resolvedInteractionScope: options.resolvedInteractionScope ?? (() => defaultScope),
      selectConfig: options.selectConfig ?? pointSelectSingle,
      effectiveIntervalKeys: options.effectiveIntervalKeys ?? (() => []),
      effectiveEmphasisKeys: options.effectiveEmphasisKeys ?? (() => []),
      inspectionFocus: options.inspectionFocus ?? (() => null),
      candidateSemanticKeys: options.candidateSemanticKeys ?? identityCandidateKeys,
      onselect: options.onselect ?? noSelect,
      oninteraction: options.oninteraction ?? noInteraction,
      announce: options.announce ?? (() => {}),
    }),
  );
  return { state, destroy };
}

describe("createSelectionState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    const model = modelFor(continuousSpec());
    let intervalKeysCalls = 0;
    let emphasisKeysCalls = 0;
    let inspectionFocusCalls = 0;
    let candidateSemanticKeysCalls = 0;
    let onselectCalls = 0;
    let oninteractionCalls = 0;
    let announceCalls = 0;

    const { value: state, destroy } = withEffectRoot(() =>
      createSelectionState({
        model: () => model,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        selectConfig: pointSelectSingle,
        effectiveIntervalKeys: () => {
          intervalKeysCalls++;
          return [];
        },
        effectiveEmphasisKeys: () => {
          emphasisKeysCalls++;
          return [];
        },
        inspectionFocus: () => {
          inspectionFocusCalls++;
          return null;
        },
        candidateSemanticKeys: (candidate) => {
          candidateSemanticKeysCalls++;
          return identityCandidateKeys(candidate);
        },
        onselect: (): SelectCb => {
          onselectCalls++;
          return noSelectCb();
        },
        oninteraction: (): InteractionCb => {
          oninteractionCalls++;
          return noInteractionCb();
        },
        announce: () => {
          announceCalls++;
        },
      }),
    );

    expect(intervalKeysCalls).toBe(0);
    expect(emphasisKeysCalls).toBe(0);
    expect(inspectionFocusCalls).toBe(0);
    expect(candidateSemanticKeysCalls).toBe(0);
    expect(onselectCalls).toBe(0);
    expect(oninteractionCalls).toBe(0);
    expect(announceCalls).toBe(0);
    // Accessor + flush must not reach armed deps (construction-time derived
    // only reads interaction/scope).
    expect(state.effectiveSelectedKeys).toEqual([]);
    flushSync();
    expect(intervalKeysCalls).toBe(0);
    expect(emphasisKeysCalls).toBe(0);
    expect(inspectionFocusCalls).toBe(0);
    expect(candidateSemanticKeysCalls).toBe(0);
    expect(onselectCalls).toBe(0);
    expect(oninteractionCalls).toBe(0);
    expect(announceCalls).toBe(0);
    destroy();
  });
});

describe("createSelectionState local mode", () => {
  it("togglePointKeys single replaces; multiple unions; commit dedupes; clear empty is silent", () => {
    const multipleBox = reactiveBox(false);
    const events: PlotSelection[] = [];
    const log: string[] = [];
    const { state, destroy } = mountSelectionController({
      selectConfig: () => (multipleBox.value ? pointSelectMultiple() : pointSelectSingle()),
      onselect: () => (event) => {
        log.push("onselect");
        events.push(event);
      },
      oninteraction: () => () => {
        log.push("oninteraction");
      },
      announce: () => {
        log.push("announce");
      },
    });

    state.togglePointKeys(["a", "a"], "pointer");
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual(["a"]);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(buildPointSelectionEvent(["a"], "pointer"));

    // Single mode: replace
    state.togglePointKeys(["b"], "pointer");
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual(["b"]);

    // Multiple mode: union
    multipleBox.set(true);
    flushSync();
    state.togglePointKeys(["c"], "pointer");
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual(["b", "c"]);

    // Toggle off one key in multiple mode
    state.togglePointKeys(["b"], "pointer");
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual(["c"]);

    // Clear with selection emits one point clear event
    const beforeClear = events.length;
    log.length = 0;
    state.clearPointSelection("keyboard");
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual([]);
    expect(events).toHaveLength(beforeClear + 1);
    expect(events.at(-1)).toEqual(buildPointSelectionEvent([], "keyboard"));
    // Emission order: announce → onselect → oninteraction
    expect(log).toEqual(["announce", "onselect", "oninteraction"]);

    // Clear with empty selection → early return silent
    const afterEmpty = events.length;
    log.length = 0;
    state.clearPointSelection("keyboard");
    flushSync();
    expect(events).toHaveLength(afterEmpty);
    expect(log).toEqual([]);

    destroy();
  });
});

describe("createSelectionState controller mode", () => {
  it("commit canonicalizes unsorted duplicate keys; no-transition is silent", () => {
    const controller = createPlotInteraction();
    const events: PlotSelection[] = [];
    const { state, destroy } = mountSelectionController({
      interaction: () => controller,
      onselect: () => (event) => {
        events.push(event);
      },
    });

    // Unsorted duplicates — setSelection canonicalizes (dedupe + sort).
    state.togglePointKeys(["c", "a", "b", "a"], "pointer");
    flushSync();
    const canonical = controller.selected(defaultScope);
    expect(canonical).toEqual(["a", "b", "c"]);
    expect(state.effectiveSelectedKeys).toEqual(canonical);
    expect(events).toHaveLength(1);
    expect(events[0]?.keys).toEqual(canonical);

    // Same selection (no-transition) → NO emit
    // Toggle all selected off then on with same multiset via clear+set:
    // re-toggling currently selected keys removes them (toggle algebra).
    // Drive via a second mount path: setSelection same keys returns null.
    const before = events.length;
    controller.setSelection(["a", "b", "c"], {
      scope: defaultScope,
      source: "pointer",
    });
    // Force re-read of effectiveSelectedKeys
    flushSync();
    expect(state.effectiveSelectedKeys).toEqual(["a", "b", "c"]);
    // togglePointKeys with keys already all-selected removes them — instead
    // use emit path through setSelection null transition by re-setting same:
    // the public API only reaches commit via toggle/clear. clear then re-toggle
    // always changes. Pin no-emit via second identical setSelection on the
    // controller and assert controller returns null + state does not re-emit
    // when we only touch the controller (state reads revision).
    const transition = controller.setSelection(["c", "b", "a"], {
      scope: defaultScope,
      source: "pointer",
    });
    expect(transition).toBeNull();
    flushSync();
    expect(events).toHaveLength(before);

    // Clear then re-commit same multiset through toggle (single mode replaces)
    state.clearPointSelection("pointer");
    flushSync();
    expect(events.at(-1)?.keys).toEqual([]);
    state.togglePointKeys(["b", "a", "b"], "pointer");
    flushSync();
    // Single mode: nextPointSelectionKeys returns [...toggled] then commit
    // Set-dedupes to insertion order ["b","a"] in local, but controller
    // canonicalizes to sorted ["a","b"].
    expect(state.effectiveSelectedKeys).toEqual(["a", "b"]);
    expect(events.at(-1)?.keys).toEqual(["a", "b"]);

    destroy();
  });

  it("controller no-transition through public toggle after clear is a real emit only on change", () => {
    const controller = createPlotInteraction();
    const events: PlotSelection[] = [];
    const { state, destroy } = mountSelectionController({
      interaction: () => controller,
      selectConfig: pointSelectMultiple,
      onselect: () => (event) => {
        events.push(event);
      },
    });

    state.togglePointKeys(["a"], "pointer");
    flushSync();
    expect(events).toHaveLength(1);

    // Toggle a again → removes a → emit
    state.togglePointKeys(["a"], "pointer");
    flushSync();
    expect(events).toHaveLength(2);
    expect(events[1]?.keys).toEqual([]);

    // Toggle empty keys → silent (toggle early return)
    state.togglePointKeys([], "pointer");
    flushSync();
    expect(events).toHaveLength(2);

    destroy();
  });
});

describe("createSelectionState anchors", () => {
  it("computeSelectedAnchors unions selected + interval keys with literal coords", () => {
    const model = modelFor(continuousSpec());
    // Find anchors for row indexes "0" and "1"
    const expected: { x: number; y: number }[] = [];
    for (let id = 0; id < model.candidates.size; id++) {
      const c = model.candidates.candidate(id);
      if (c === null || c.rowIndex === null) continue;
      if (c.rowIndex === 0 || c.rowIndex === 1) {
        const identity = `${String(c.x)}:${String(c.y)}`;
        if (!expected.some((a) => `${a.x}:${a.y}` === identity)) {
          expected.push({ x: c.x, y: c.y });
        }
      }
    }
    expect(expected.length).toBeGreaterThan(0);

    const { state, destroy } = mountSelectionController({
      model: () => model,
      selectConfig: pointSelectMultiple,
      effectiveIntervalKeys: () => ["1"],
    });

    state.togglePointKeys(["0"], "pointer");
    flushSync();
    expect(state.computeSelectedAnchors()).toEqual(expected);

    destroy();
  });

  it("computeEmphasizedAnchors reads emphasis keys; empty keys skip candidate walk", () => {
    const model = modelFor(continuousSpec());
    let candidateCalls = 0;
    const { state, destroy } = mountSelectionController({
      model: () => model,
      effectiveEmphasisKeys: () => ["0"],
      candidateSemanticKeys: (candidate) => {
        candidateCalls++;
        return identityCandidateKeys(candidate);
      },
    });

    const anchors = state.computeEmphasizedAnchors();
    expect(anchors.length).toBeGreaterThan(0);
    expect(candidateCalls).toBeGreaterThan(0);

    candidateCalls = 0;
    const empty = mountSelectionController({
      model: () => model,
      effectiveEmphasisKeys: () => [],
      candidateSemanticKeys: (candidate) => {
        candidateCalls++;
        return identityCandidateKeys(candidate);
      },
    });
    expect(empty.state.computeEmphasizedAnchors()).toEqual([]);
    expect(candidateCalls).toBe(0);
    empty.destroy();
    destroy();
  });
});

describe("createSelectionState masks", () => {
  it("computeInteractionMasks non-empty only when focus keys exist; inspection contributes", () => {
    const model = modelFor(continuousSpec());
    const emphasisBox = reactiveBox<readonly PropertyKey[]>([]);
    const focusBox = reactiveBox<{
      sourceKeys: readonly PropertyKey[];
      key: PropertyKey | null;
    } | null>(null);

    const { state, destroy } = mountSelectionController({
      model: () => model,
      effectiveEmphasisKeys: () => emphasisBox.value,
      inspectionFocus: () => focusBox.value,
    });

    // No focus keys → empty masks
    expect(state.computePresentationFocusKeys()).toEqual([]);
    const projections = state.computeSemanticCandidateProjections();
    expect(projections.length).toBeGreaterThan(0);
    expect(state.computeInteractionMasks([], projections)).toEqual([]);

    // Emphasis alone
    emphasisBox.set(["0"]);
    flushSync();
    const focusKeys = state.computePresentationFocusKeys();
    expect(focusKeys).toEqual(["0"]);
    const masks = state.computeInteractionMasks(focusKeys, projections);
    expect(masks.length).toBeGreaterThan(0);
    expect(masks.some((m) => m !== null)).toBe(true);

    // Inspection focus merges when emphasis non-empty
    focusBox.set({ sourceKeys: ["1"], key: "2" });
    flushSync();
    const merged = state.computePresentationFocusKeys();
    expect(merged).toEqual(["0", "1", "2"]);

    destroy();
  });

  it("focus-only change does not recompute candidate projections (host memo boundary)", () => {
    const model = modelFor(continuousSpec());
    const emphasisBox = reactiveBox<readonly PropertyKey[]>(["0"]);
    let candidateCalls = 0;

    const { value, destroy } = withFlushedEffectRoot(() => {
      const state = createSelectionState({
        model: () => model,
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        selectConfig: pointSelectSingle,
        effectiveIntervalKeys: () => [],
        effectiveEmphasisKeys: () => emphasisBox.value,
        inspectionFocus: () => null,
        candidateSemanticKeys: (candidate) => {
          candidateCalls++;
          return identityCandidateKeys(candidate);
        },
        onselect: noSelect,
        oninteraction: noInteraction,
        announce: () => {},
      });
      // Host-shaped independent memo boundaries (three separate deriveds,
      // via the rune-backed helper — runes are unavailable in .test.ts).
      const focus = derivedBox(() => state.computePresentationFocusKeys());
      const projections = derivedBox(() => state.computeSemanticCandidateProjections());
      const masks = derivedBox(() => state.computeInteractionMasks(focus.value, projections.value));
      return {
        state,
        get focus() {
          return focus.value;
        },
        get masks() {
          return masks.value;
        },
        get projections() {
          return projections.value;
        },
      };
    });

    // Initial read materializes projections
    void value.focus;
    void value.projections;
    void value.masks;
    flushSync();
    const callsAfterInit = candidateCalls;
    expect(callsAfterInit).toBeGreaterThan(0);

    // Focus-only flip: change emphasis keys, re-read focus + masks
    emphasisBox.set(["0", "1"]);
    flushSync();
    void value.focus;
    void value.masks;
    // Projections derived should NOT re-run candidateSemanticKeys
    expect(candidateCalls).toBe(callsAfterInit);
    expect(value.focus).toEqual(["0", "1"]);
    expect(value.masks.length).toBeGreaterThan(0);

    destroy();
  });
});

describe("createSelectionState callback replacement", () => {
  it("swaps onselect + oninteraction boxes post-flush", () => {
    const onselectBox = reactiveBox<SelectCb>(noSelectCb());
    const oninteractionBox = reactiveBox<InteractionCb>(noInteractionCb());
    const log: string[] = [];

    const { state, destroy } = mountSelectionController({
      onselect: () => onselectBox.value,
      oninteraction: () => oninteractionBox.value,
      announce: () => {
        log.push("announce");
      },
    });

    onselectBox.set(() => {
      log.push("select-a");
    });
    oninteractionBox.set(() => {
      log.push("interaction-a");
    });
    flushSync();
    state.togglePointKeys(["a"], "pointer");
    flushSync();
    expect(log).toEqual(["announce", "select-a", "interaction-a"]);

    log.length = 0;
    onselectBox.set(() => {
      log.push("select-b");
    });
    oninteractionBox.set(() => {
      log.push("interaction-b");
    });
    flushSync();
    state.togglePointKeys(["b"], "pointer");
    flushSync();
    expect(log).toEqual(["announce", "select-b", "interaction-b"]);

    destroy();
  });
});
