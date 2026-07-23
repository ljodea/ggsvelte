/**
 * createInspectionState tests — dismiss and keyboard traversal.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import type { CellValue } from "@ggsvelte/core";

import type { PlotInspection } from "../../src/lib/interaction/interaction.js";
import { applyInspectionDismissSideEffects } from "../../src/lib/interaction/transition-owner.js";
import {
  candidateHit,
  continuousSpec,
  modelFor,
  mountInspectionController,
} from "./inspection-state.harness.js";

describe("createInspectionState dismissInspection", () => {
  it("escape vs close: clears tooltip/pending, brush, chooseTool, refocus, emit-clear", async () => {
    const model = modelFor(continuousSpec());
    let tooltipHovered = true;
    let brushCleared = 0;
    let chooseToolCalls: string[] = [];
    const capture = document.createElement("div");
    const focusSpy = vi.spyOn(capture, "focus");
    const events: PlotInspection<Record<string, CellValue>>[] = [];

    const { state, destroy } = mountInspectionController({
      model: () => model,
      tooltipHovered: () => tooltipHovered,
      clearTooltipHovered: () => {
        tooltipHovered = false;
      },
      captureSurface: () => capture,
      oninspect: () => (event) => {
        events.push(event);
      },
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    events.length = 0;

    const escapePlan = state.dismissInspection("escape", "keyboard", {
      returnToInspect: true,
    });
    applyInspectionDismissSideEffects(escapePlan, {
      clearBrush: () => {
        brushCleared++;
      },
      chooseTool: (tool) => {
        chooseToolCalls.push(tool);
      },
    });
    flushSync();
    expect(state.inspection).toBeNull();
    expect(tooltipHovered).toBe(false);
    expect(brushCleared).toBeGreaterThanOrEqual(1);
    expect(chooseToolCalls).toContain("inspect");
    expect(events.some((event) => event.phase === "clear")).toBe(true);

    // close with restoreFocus schedules captureSurface focus.
    tooltipHovered = true;
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    events.length = 0;
    const closePlan = state.closeInspection("pointer", true);
    applyInspectionDismissSideEffects(closePlan, {
      clearBrush: () => {
        brushCleared++;
      },
      chooseTool: (tool) => {
        chooseToolCalls.push(tool);
      },
    });
    flushSync();
    expect(state.inspection).toBeNull();
    await Promise.resolve();
    expect(focusSpy).toHaveBeenCalled();
    // close plan must not clear brush / return to inspect
    expect(closePlan.clearBrush).toBe(false);
    expect(closePlan.returnToInspect).toBe(false);

    destroy();
  });
});

describe("createInspectionState traversal", () => {
  it("move-by-delta wraps; reset only via resetTraversalIndex", () => {
    const model = modelFor(continuousSpec());
    const { state, destroy } = mountInspectionController({
      model: () => model,
    });

    // Seed traversal at index 0 via navigate from -1.
    state.navigate(1);
    flushSync();
    expect(state.inspection).not.toBeNull();
    const firstAnchor = state.inspection!.focus.anchor;

    state.navigate(1);
    flushSync();
    const secondAnchor = state.inspection!.focus.anchor;
    // With 3 points, delta advances focus.
    expect(secondAnchor).not.toEqual(firstAnchor);

    // Wrap: enough steps returns toward the set.
    state.navigate(10);
    flushSync();
    expect(state.inspection).not.toBeNull();

    state.resetTraversalIndex();
    // Reset alone does not clear inspection — only the index (blur path).
    expect(state.inspection).not.toBeNull();
    // The reset's OBSERVABLE effect: the next navigate(1) starts over from
    // the FIRST traversal hit (index -1 → 0), not from the stale mid-set
    // position — a no-op reset would land elsewhere.
    state.navigate(1);
    flushSync();
    expect(state.inspection!.focus.anchor).toEqual(firstAnchor);

    // Directional navigate requires an active inspection.
    state.navigateDirection(1, 0);
    flushSync();
    expect(state.inspection).not.toBeNull();

    destroy();
  });

  it("keyboard navigate delegates to CandidateStore without materializing traversal hits", () => {
    const model = modelFor(continuousSpec());
    const realCandidate = model.candidates.candidate.bind(model.candidates);
    let candidateCalls = 0;
    model.candidates.candidate = (id: number) => {
      candidateCalls += 1;
      return realCandidate(id);
    };
    expect(model.candidates.size).toBeGreaterThan(1);

    const { state, destroy } = mountInspectionController({
      model: () => model,
    });

    state.navigate(1);
    flushSync();
    expect(state.inspection).not.toBeNull();
    const firstKey = state.inspection!.focus.key;
    // The store chooses one id and inspection fetches only that candidate.
    expect(candidateCalls).toBe(1);

    candidateCalls = 0;
    state.navigate(1);
    flushSync();
    expect(state.inspection).not.toBeNull();
    expect(state.inspection!.focus.key).not.toEqual(firstKey);
    expect(candidateCalls).toBe(1);

    destroy();
  });

  it("delegates directional navigation and coincident cycling to CandidateStore", () => {
    const model = modelFor(continuousSpec());
    const realTraverse = model.candidates.traverse.bind(model.candidates);
    const realCycle = model.candidates.cycle.bind(model.candidates);
    const traversals: string[] = [];
    let cycleCalls = 0;
    model.candidates.traverse = (id, direction, step) => {
      traversals.push(direction ?? "next");
      return realTraverse(id, direction, step);
    };
    model.candidates.cycle = (id, step) => {
      cycleCalls += 1;
      return realCycle(id, step);
    };

    const { state, destroy } = mountInspectionController({
      model: () => model,
    });

    state.navigate(1);
    state.navigateDirection(1, 0);
    state.cycleCoincident(1);
    flushSync();

    expect(traversals).toContain("right");
    expect(cycleCalls).toBe(1);

    destroy();
  });
});
