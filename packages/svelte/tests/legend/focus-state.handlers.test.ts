/**
 * Legend-focus controller handler unit tests (construction, preview/commit,
 * local vs controller, suppress/touch, callback replacement).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { LegendFocusEvent } from "../../src/lib/interaction/interaction.js";
import { createPlotInteraction } from "../../src/lib/interaction/controller.svelte.js";
import { createLegendFocusState } from "../../src/lib/legend/focus-state.svelte.js";
import { withEffectRoot } from "../helpers/effect-root.svelte.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import { until } from "../helpers/until.js";
import {
  clickEvent,
  defaultScope,
  type FocusCb,
  keyEvent,
  mountFocusController,
  noCallback,
  noController,
} from "./focus-state.harness.js";

describe("createLegendFocusState construction", () => {
  it("does not invoke armed later-declared getters during construction (before first flush)", () => {
    let entryKeysCalls = 0;
    let entriesCalls = 0;
    let pressedCalls = 0;

    const { value: state, destroy } = withEffectRoot(() =>
      createLegendFocusState({
        interaction: noController,
        resolvedInteractionScope: () => defaultScope,
        legendFocusEnabled: () => true,
        legendFocusPreviewEnabled: () => true,
        root: () => null,
        entryKeys: () => {
          entryKeysCalls++;
          return {
            legendEntryKeyIndex: new Map(),
            keysForLegend: () => [],
          };
        },
        entries: () => {
          entriesCalls++;
          return [];
        },
        pressed: () => {
          pressedCalls++;
          return null;
        },
        onlegendfocus: noCallback,
        oninteraction: noCallback,
        announce: () => {},
      }),
    );

    expect(entryKeysCalls).toBe(0);
    expect(entriesCalls).toBe(0);
    expect(pressedCalls).toBe(0);
    // Deriveds are lazy on client and server at the 5.33.1 floor, so this
    // guard proves the exposed accessors reach no armed getter (reads + one
    // flush below) — the construction-read discipline. Direct (non-derived)
    // construction-time reads of armed deps would throw right here.
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(state.previewIdentity).toBeNull();
    expect(state.rovingIndex).toBe(0);
    flushSync();
    expect(entryKeysCalls).toBe(0);
    expect(entriesCalls).toBe(0);
    expect(pressedCalls).toBe(0);
    destroy();
  });
});

describe("createLegendFocusState preview → commit cycle", () => {
  it("keyboard focus previews then Enter commits with literal payload", () => {
    const events: LegendFocusEvent[] = [];
    const announcements: string[] = [];
    const { state, model, destroy } = mountFocusController({
      onlegendfocus: () => (event) => {
        events.push(event);
      },
      announce: (message) => {
        announcements.push(message);
      },
    });

    const entries = state.computeInteractiveEntries(model());
    expect(entries).toHaveLength(2);
    const northIndex = entries.findIndex((entry) => entry.entry.value === "north");
    expect(northIndex).toBeGreaterThanOrEqual(0);

    state.onLegendFocus(northIndex);
    flushSync();

    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);
    expect(state.previewIdentity).toEqual({ scale: "color", entryIndex: northIndex });
    // Focus preview source is "focus" → maps to keyboard InteractionSource.
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
    expect(state.computeLegendPressed(model())).toEqual({
      scale: "color",
      entryIndex: northIndex,
    });
    expect(announcements.at(-1)).toMatch(/focused/);

    destroy();
  });
});

describe("createLegendFocusState local vs controller emphasis", () => {
  it("local mode: commit writes local keys; Escape clears them and emits", () => {
    const events: LegendFocusEvent[] = [];
    const { state, model, destroy } = mountFocusController({
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

    // Escape routes through resolveLegendKeyAction → clear with "keyboard".
    state.onLegendKeydown(keyEvent("Escape"), northIndex);
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual([]);
    expect(events.filter((event) => event.phase === "clear")).toEqual([
      { type: "legend-focus", phase: "clear", source: "keyboard" },
    ]);

    destroy();
  });

  it("controller mode: local keys untouched; controller revision drives emphasis recompute", () => {
    const controller = createPlotInteraction();
    // Production-shaped plain getter: recompute must flow from the
    // controller's own revision tracking, not test scaffolding.
    const { state, model, destroy } = mountFocusController({
      interaction: () => controller,
    });

    expect(state.effectiveEmphasisKeys).toEqual([]);
    controller.setEmphasis(["b"], { scope: defaultScope, source: "programmatic" });
    flushSync();
    expect(state.effectiveEmphasisKeys).toEqual(["b"]);

    // Committing an UNPRESSED entry writes THROUGH to the controller
    // (commitLegend calls interaction.setEmphasis) — local keys never used.
    const northIndex = state
      .computeInteractiveEntries(model())
      .findIndex((entry) => entry.entry.value === "north");
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(controller.emphasized(defaultScope)).toEqual(["a", "c"]);
    expect(state.effectiveEmphasisKeys).toEqual(["a", "c"]);

    // Clicking the now-pressed entry is a toggle-clear: clearEmphasis on the
    // controller, not a local mutation.
    state.onLegendClick(clickEvent(), northIndex);
    flushSync();
    expect(controller.emphasized(defaultScope)).toEqual([]);
    expect(state.effectiveEmphasisKeys).toEqual([]);

    destroy();
  });
});

describe("createLegendFocusState suppress interplay", () => {
  it("touch pointerdown → pointerup commits once and suppresses synthetic click", () => {
    const events: LegendFocusEvent[] = [];
    const { state, model, destroy } = mountFocusController({
      onlegendfocus: () => (event) => {
        events.push(event);
      },
    });

    const southIndex = state
      .computeInteractiveEntries(model())
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

    const { state, model, destroy } = mountFocusController({
      onlegendfocus: () => focusBox.value,
      oninteraction: () => interactionBox.value,
    });

    const northIndex = state
      .computeInteractiveEntries(model())
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
