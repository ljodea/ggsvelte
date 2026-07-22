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
  wrapReducerWithLog,
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
      registerEffects: false,
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
      registerEffects: false,
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

    // Fresh schedule + flush → transient on both authorities.
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    flushFrame();
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(reducer.state.inspection.kind).toBe("transient");
    expect(reducer.state.inspection.candidate?.id).toBe(candidate.id);

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

    // Stale token → drop; skip reducer dispatch (atomic).
    state.setInspection(null, "pointer");
    flushSync();
    reducer.dispatch({ type: "inspect", candidate: null, source: "programmatic" });
    // Clear activeCandidate so a later set-active is guaranteed to commit.
    reducer.dispatch({ type: "set-active", candidate: null });
    state.schedulePointerInspect({
      point: { x: candidate.x, y: candidate.y },
      source: "pointer",
      mode: "xy",
      maxDistance: 1e6,
    });
    const scheduledToken = reducer.frameToken();
    // Advance revision without cancelling the schedule (set-active with a
    // different ref always commits when active was null).
    reducer.dispatch({
      type: "set-active",
      candidate: {
        epoch: model.runId,
        id: candidate.id + 10_000,
        panelId: candidate.panelId,
        x: candidate.x,
        y: candidate.y,
      },
    });
    expect(reducer.accepts(scheduledToken)).toBe(false);
    const revBefore = reducer.state.revision;
    flushFrame();
    flushSync();
    expect(state.inspection).toBeNull();
    // Drop skipped dispatch — inspection kind stays idle (not transient).
    expect(reducer.state.inspection.kind).toBe("idle");
    expect(reducer.state.revision).toBe(revBefore);

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
      registerEffects: false,
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
  it("pins ordered sequence: dispatch1(non-null) → emit while still non-null → clear → dispatch2(null)", () => {
    const model = modelFor(continuousSpec());
    const log: string[] = [];
    // controllerRef lets both spies record inspection-nullness AT CALL TIME —
    // that positional evidence is what discriminates the ordering (a refactor
    // moving the state clear after the second dispatch flips dispatch-2's tag).
    let controllerRef: ReturnType<typeof createInspectionState> | null = null;
    const stateTag = (): string => (controllerRef?.inspection === null ? "null" : "non-null");
    const base = createInteractionReducer();
    const wrapped = wrapReducerWithLog(base, (count) => {
      log.push(`dispatch-${count}-inspection-${stateTag()}`);
    });

    const handle = withFlushedEffectRoot(() => {
      const controller = createInspectionState({
        model: () => model,
        reducer: () => wrapped,
        inspectConfig: defaultInspect,
        inspectEnabled: () => true,
        dataIdentityEpoch: () => "epoch-1",
        keyAt: keyAtForModel(model),
        root: () => null,
        captureSurface: () => null,
        plotId: () => "plot",
        tooltipHovered: () => false,
        clearTooltipHovered: () => {},
        clearBrush: () => {},
        chooseTool: () => {},
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

    // Exact host order (base 1173-1180): first inspect-null dispatch and the
    // clear emit both observe a STILL NON-NULL inspection; the state clear +
    // coordinator release happen between the emit and the SECOND dispatch, so
    // dispatch-2 observes null. (The transient coordinator release itself is
    // module-private and not observable without API widening; its position is
    // pinned transitively by the state-clear tag on dispatch-2.)
    expect(log).toEqual([
      "dispatch-1-inspection-non-null",
      "emit-clear-inspection-non-null",
      "dispatch-2-inspection-null",
    ]);
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
      registerEffects: false,
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
