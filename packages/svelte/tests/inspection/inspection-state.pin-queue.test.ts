/**
 * createInspectionState tests — setInspection, pin, queue frames, clear ordering, completeness.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { CandidateFacts, CellValue } from "@ggsvelte/core";

import type { PlotInspection } from "../../src/lib/interaction/interaction.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";
import {
  candidateHit,
  continuousSpec,
  createInspectionState,
  createInteractionReducer,
  defaultInspect,
  firstCandidate,
  hitFromCandidate,
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

describe("createInspectionState setInspection", () => {
  it("applies a transient snapshot and gates re-emits by fingerprint", () => {
    const model = modelFor(continuousSpec());
    const events: PlotInspection<Record<string, CellValue>>[] = [];
    const { state, destroy } = mountInspectionController({
      model: () => model,
      oninspect: () => (event) => {
        events.push(event);
      },
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(state.inspection).not.toBeNull();
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.phase).toBe("change");
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("change");

    // Same fingerprint → skip emit.
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(events).toHaveLength(1);

    // Clear emits once.
    state.setInspection(null, "pointer");
    flushSync();
    expect(state.inspection).toBeNull();
    expect(events).toHaveLength(2);
    expect(events[1]?.phase).toBe("clear");

    destroy();
  });

  it("cancels queued inspect before applying a touch tap so rAF cannot override", () => {
    const model = modelFor(continuousSpec());
    const { state, flushFrame, destroy } = mountInspectionController({
      model: () => model,
      deferredFrames: true,
      inspectConfig: () => ({ mode: "xy", maxDistance: 1e6, pin: false }),
    });
    const hover = model.candidates.candidate(0);
    const tap = model.candidates.candidate(1);
    if (hover === null || tap === null) throw new Error("expected two candidates");
    expect(hover.id).not.toBe(tap.id);

    // Small touch move schedules inspect for hover candidate.
    state.schedulePointerInspect({
      point: { x: hover.x, y: hover.y },
      source: "touch",
      mode: "xy",
      maxDistance: 1e6,
    });
    // Tap applies a different candidate without waiting for the frame.
    state.setInspection(hitFromCandidate(tap), "touch", "transient", "xy", tap);
    flushSync();
    expect(state.inspection?.focus.anchor).toEqual({ x: tap.x, y: tap.y });

    // Stale queued frame must not re-apply hover after the tap.
    flushFrame();
    flushSync();
    expect(state.inspection?.focus.anchor).toEqual({ x: tap.x, y: tap.y });

    destroy();
  });
});

describe("createInspectionState pin cycle", () => {
  it("transient → pin flip → unpin announcement + release", () => {
    const model = modelFor(continuousSpec());
    const announcements: string[] = [];
    const { state, destroy } = mountInspectionController({
      model: () => model,
      announce: (message) => {
        announcements.push(message);
      },
    });

    const { candidate, hit } = candidateHit(model);
    state.setInspection(hit, "pointer", "transient", "xy", candidate);
    flushSync();
    expect(state.inspection?.state).toBe("transient");

    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((message) => message.includes("unpinned"))).toBe(true);

    destroy();
  });

  it("restore-pending path via schedulePointerInspect while pinned", () => {
    const model = modelFor(continuousSpec());
    const { state, flushFrame, destroy } = mountInspectionController({
      model: () => model,
      deferredFrames: true,
    });

    const first = candidateHit(model);
    state.setInspection(first.hit, "pointer", "transient", "xy", first.candidate);
    flushSync();
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    let second: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate !== null && candidate.id !== first.candidate.id) {
        second = candidate;
        break;
      }
    }
    if (second === null) throw new Error("expected a second candidate");

    state.schedulePointerInspect({
      point: { x: second.x, y: second.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    // Still pinned — pending was stashed, not applied.
    expect(state.inspection?.state).toBe("pinned");

    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.focus.anchor).toEqual({
      x: second.x,
      y: second.y,
    });

    destroy();
  });
});

describe("createInspectionState schedulePointerInspect / onInspectPointerFrame", () => {
  it("applies on flush, drops stale tokens without reducer dispatch, stashes when pinned, cancels before flush", () => {
    const model = modelFor(continuousSpec());
    const announcements: string[] = [];
    const { state, reducer, flushFrame, destroy } = mountInspectionController({
      model: () => model,
      announce: (message) => {
        announcements.push(message);
      },
      deferredFrames: true,
    });
    const { candidate } = candidateHit(model);

    // Empty frame path: no pending → none; no inspection change.
    expect(
      state.onInspectPointerFrame({
        type: "inspect",
        candidate: null,
        source: "pointer",
      }),
    ).toBe(true);
    flushSync();
    expect(state.inspection).toBeNull();

    // Fresh schedule + flush → InspectionState owns transient lifecycle.
    // Scene-reconcile may have already bumped reducer revision at mount;
    // pin that applying inspect does not advance it further.
    const revisionBeforeInspect = reducer.state.revision;
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    // Reducer is not the inspection authority (inspect frames never commit).
    expect(reducer.state.revision).toBe(revisionBeforeInspect);

    // Re-apply empty (queues cleared) keeps transient.
    expect(
      state.onInspectPointerFrame({
        type: "inspect",
        candidate: {
          epoch: model.runId,
          id: candidate.id,
          panelId: candidate.panelId,
          x: candidate.x,
          y: candidate.y,
        },
        source: "pointer",
      }),
    ).toBe(true);
    flushSync();
    expect(state.inspection?.state).toBe("transient");

    // Stale token → drop (no InspectionState apply).
    state.setInspection(null, "pointer");
    flushSync();
    reducer.dispatch({ type: "set-tool", tool: "select-area" });
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    const scheduledToken = reducer.frameToken();
    // begin-area bumps revision without cancelling the inspect schedule.
    reducer.dispatch({
      type: "begin-area",
      point: { x: 0, y: 0 },
      panelId: "panel:all",
    });
    expect(reducer.accepts(scheduledToken)).toBe(false);
    flushFrame();
    flushSync();
    expect(state.inspection).toBeNull();

    // Cancel before flush → no apply.
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    state.cancelPointerInspect({ pendingPinned: "preserve" });
    flushFrame();
    flushSync();
    expect(state.inspection).toBeNull();

    // Pin + schedule other candidate → stash; single-stash; restore then flip.
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    let other: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const c = model.candidates.candidate(id);
      if (c !== null && c.id !== candidate.id) {
        other = c;
        break;
      }
    }
    if (other === null) throw new Error("expected another candidate");

    state.schedulePointerInspect({
      point: { x: other.x, y: other.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    // Second schedule+flush must not double-stash.
    state.schedulePointerInspect({
      point: { x: other.x, y: other.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.focus.anchor).toEqual({ x: other.x, y: other.y });
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(false);

    state.toggleInspectionPin("keyboard");
    flushSync();
    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(true);

    // cancelPointerInspect({ discard }) drops stash → flip announces.
    state.toggleInspectionPin("keyboard");
    flushSync();
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    state.cancelPointerInspect({ pendingPinned: "discard" });
    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(true);

    destroy();
  });

  it("typed inspect cancel does not cancel a pending move-area schedule", () => {
    let frame: (() => void) | null = null;
    const frames: string[] = [];
    let controller: ReturnType<typeof createInspectionState> | null = null;
    const model = modelFor(continuousSpec());
    const reducer = createInteractionReducer({
      scheduleFrame: (callback) => {
        frame = callback;
        return 1;
      },
      cancelFrame: () => {
        frame = null;
      },
      onPointerFrame: (action) => {
        frames.push(action.type);
        if (action.type === "inspect") return controller!.onInspectPointerFrame(action);
        return true;
      },
    });
    const { state, destroy } = mountInspectionController({
      model: () => model,
      reducer: () => reducer,
    });
    controller = state;

    reducer.queuePointer({ type: "move-area", point: { x: 1, y: 2 } });
    expect(frame).not.toBeNull();
    state.cancelPointerInspect({ pendingPinned: "preserve" });
    expect(frame).not.toBeNull();
    frame?.();
    expect(frames).toEqual(["move-area"]);

    destroy();
  });
});
describe("createInspectionState setInspection(null) clear ordering", () => {
  it("emits clear while inspection is still non-null, then clears state", () => {
    const model = modelFor(continuousSpec());
    const log: string[] = [];
    let controllerRef: ReturnType<typeof createInspectionState> | null = null;
    const stateTag = (): string => (controllerRef?.inspection === null ? "null" : "non-null");

    const handle = withFlushedEffectRoot(() => {
      const controller = createInspectionState({
        model: () => model,
        reducer: () => createInteractionReducer(),
        inspectConfig: defaultInspect,
        inspectEnabled: () => true,
        dataIdentityEpoch: () => "epoch-1",
        keyAt: keyAtForModel(model),
        root: () => null,
        captureSurface: () => null,
        plotId: () => "plot",
        tooltipHovered: () => false,
        clearTooltipHovered: () => {},
        oninspect: () => (event) => {
          if (event.phase === "clear") log.push(`emit-clear-inspection-${stateTag()}`);
        },
        oninteraction: noInteraction,
        announce: () => {},
        clearAnnouncement: () => {},
      });
      controllerRef = controller;
      return controller;
    });

    const { candidate, hit } = candidateHit(model);
    handle.value.setInspection(hit, "pointer", "transient", "xy", candidate);
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
    const hit = hitFromCandidate(candidate);
    state.setInspection(hit, "pointer", "transient", "x", candidate);
    flushSync();
    expect(state.inspection).not.toBeNull();
    const transientCount = state.inspection!.members.length;
    expect(transientCount).toBe(8);

    // Enable oninspect (current deps) → complete resolve carries all members.
    oninspectBox.set(() => {});
    // Re-resolve via clear + apply so resolveInspectionCompleteness re-runs.
    state.setInspection(null, "pointer");
    flushSync();
    state.setInspection(hit, "pointer", "transient", "x", candidate);
    flushSync();
    expect(state.inspection!.members.length).toBeGreaterThan(8);
    expect(state.inspection!.members.length).toBe(12);

    destroy();
  });
});
