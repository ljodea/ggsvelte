/**
 * createIntervalState tests — write-before-emit, applyBrushSelectEnd, selectConfig.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import {
  brushEvent,
  continuousSpec,
  modelFor,
  mountIntervalController,
  nonPersistentSelect,
  persistentSelect,
  type IntervalSelection,
  type PlotSelection,
  type SelectConfig,
} from "./interval-state.harness.js";

describe("createIntervalState write-before-emit", () => {
  it("clearIntervalSelection: committedInterval is already null when emitSelection runs", () => {
    const model = modelFor(continuousSpec());
    let observedAtEmit: IntervalSelection | null | undefined = fromAny("unset");
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
