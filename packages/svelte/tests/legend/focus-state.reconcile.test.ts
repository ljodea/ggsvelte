/**
 * Legend-focus controller reconcile-effect suites (roving, committed,
 * preview, focus-disabled).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { LegendFocusEvent } from "../../src/lib/interaction/interaction.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import { modelFor } from "../helpers/model.js";
import { until } from "../helpers/until.js";
import {
  clickEvent,
  colorSpec,
  type FocusRow,
  focusRows,
  keyEvent,
  mountFocusController,
} from "./focus-state.harness.js";

describe("createLegendFocusState roving focus reconcile", () => {
  it("entry count shrink relocates roving index and queues refocus", async () => {
    const both = focusRows;
    const onlyNorth = [focusRows[0], focusRows[2]];
    const dataBox = reactiveBox<readonly FocusRow[]>(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const root = document.createElement("div");
    document.body.append(root);

    const { state, destroy } = mountFocusController({
      model: () => modelBox.value,
      data: () => dataBox.value,
      root,
    });

    // Mount two real legend targets so refocus has a destination.
    const paintTargets = (count: number) => {
      root.replaceChildren();
      for (let i = 0; i < count; i++) {
        const btn = document.createElement("button");
        btn.className = "gg-legend-target";
        btn.dataset["ggLegendTarget"] = "";
        btn.dataset["index"] = String(i);
        btn.tabIndex = i === state.rovingIndex ? 0 : -1;
        root.append(btn);
      }
    };
    paintTargets(2);
    const south = root.querySelector<HTMLElement>('[data-index="1"]')!;
    south.focus();
    // "End" routes through resolveLegendKeyAction → move to the last entry.
    state.onLegendKeydown(keyEvent("End"), 0);
    flushSync();
    expect(state.rovingIndex).toBe(1);
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

    await until(() => state.rovingIndex === 0);
    await until(
      () =>
        document.activeElement ===
        root.querySelector<HTMLElement>('[data-gg-legend-target][data-index="0"]'),
    );
    expect(state.rovingIndex).toBe(0);

    destroy();
    root.remove();
  });
});

describe("createLegendFocusState committed-reconcile", () => {
  it("catalog reshuffle drops committed identity with a single programmatic clear", () => {
    const both = focusRows;
    const onlySouth = [focusRows[1]];
    const dataBox = reactiveBox<readonly FocusRow[]>(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const events: LegendFocusEvent[] = [];

    const { state, destroy } = mountFocusController({
      model: () => modelBox.value,
      data: () => dataBox.value,
      onlegendfocus: () => (event) => {
        events.push(event);
      },
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
    const dataBox = reactiveBox<readonly FocusRow[]>(both);
    const modelBox = reactiveBox(modelFor(colorSpec(dataBox.value)));
    const events: LegendFocusEvent[] = [];

    const { state, destroy } = mountFocusController({
      model: () => modelBox.value,
      data: () => dataBox.value,
      onlegendfocus: () => (event) => {
        events.push(event);
      },
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

    const { state, model, destroy } = mountFocusController({
      legendFocusEnabled: () => enabled.value,
      onlegendfocus: () => (event) => {
        events.push(event);
      },
    });

    const northIndex = state
      .computeInteractiveEntries(model())
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
    expect(state.computeLegendPressed(model())).toBeNull();
    expect(events.slice(afterCommit)).toEqual([
      { type: "legend-focus", phase: "clear", source: "programmatic" },
    ]);

    destroy();
  });
});
