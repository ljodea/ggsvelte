/**
 * createInspectionState tests — setInspection(null) clear ordering and completeness selection.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import { testInteractionContext } from "../helpers/interaction-context.js";
import {
  candidateHit,
  continuousSpec,
  createInspectionState,
  createInteractionReducer,
  defaultInspect,
  firstCandidate,
  keyAtForModel,
  largeGroupSpec,
  modeXInspect,
  modelFor,
  mountInspectionController,
  noInspect,
  noInteraction,
  withFlushedEffectRoot,
  type InspectCb,
} from "./inspection-state.harness.js";

describe("createInspectionState setInspection(null) clear ordering", () => {
  it("emits clear while inspection is still non-null, then clears state", () => {
    const model = modelFor(continuousSpec());
    const log: string[] = [];
    let controllerRef: ReturnType<typeof createInspectionState> | null = null;
    const stateTag = (): string => (controllerRef?.inspection === null ? "null" : "non-null");

    const handle = withFlushedEffectRoot(() => {
      const controller = createInspectionState(
        testInteractionContext({
          model: () => model,
          inspectConfig: defaultInspect,
          keyAt: keyAtForModel(model),
          root: () => null,
          captureSurface: () => null,
          tooltipHovered: () => false,
          oninspect: () => (event) => {
            if (event.phase === "clear") log.push(`emit-clear-inspection-${stateTag()}`);
          },
          oninteraction: noInteraction,
          announce: () => {},
        }),
        {
          reducer: () => createInteractionReducer(),
          inspectEnabled: () => true,
          dataIdentityEpoch: () => "epoch-1",
          plotId: () => "plot",
          clearTooltipHovered: () => {},
          clearAnnouncement: () => {},
        },
      );
      controllerRef = controller;
      return controller;
    });

    const { candidate } = candidateHit(model);
    handle.value.setInspection(candidate, "pointer", "transient", "xy");
    flushSync();
    log.length = 0;

    handle.value.setInspection(null, "pointer");

    // Single-authority clear: emit observes non-null, then state is null.
    expect(log).toEqual(["emit-clear-inspection-non-null"]);
    expect(handle.value.inspection).toBeNull();

    handle.destroy();
  });
});

describe("createInspectionState completeness selection", () => {
  it("caps transient members at 8 and flips to complete when oninspect is enabled", () => {
    const model = modelFor(largeGroupSpec());
    // Group size must exceed the transient eight-member limit.
    expect(model.candidates.size).toBeGreaterThanOrEqual(12);

    const oninspectBox = reactiveBox<InspectCb>(noInspect());

    const { state, destroy } = mountInspectionController({
      model: () => model,
      // No custom content / callbacks → transient completeness.
      inspectConfig: modeXInspect,
      oninspect: () => oninspectBox.value,
      oninteraction: noInteraction,
    });

    const candidate = firstCandidate(model);
    state.setInspection(candidate, "pointer", "transient", "x");
    flushSync();
    expect(state.inspection).not.toBeNull();
    const transientCount = state.inspection!.members.length;
    expect(transientCount).toBe(8);

    // Enable oninspect (current deps) → complete resolve carries all members.
    oninspectBox.set(() => {});
    // Re-resolve via clear + apply so resolveInspectionCompleteness re-runs.
    state.setInspection(null, "pointer");
    flushSync();
    state.setInspection(candidate, "pointer", "transient", "x");
    flushSync();
    expect(state.inspection!.members.length).toBeGreaterThan(8);
    expect(state.inspection!.members.length).toBe(12);

    destroy();
  });
});
