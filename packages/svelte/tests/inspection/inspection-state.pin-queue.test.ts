/**
 * createInspectionState tests — setInspection, pin, queue frames, clear ordering, completeness.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { CandidateFacts, CellValue } from "@ggsvelte/core";

import type { PlotInspection } from "../../src/lib/interaction/interaction.js";
import type { QueuedPointerInspection } from "../../src/lib/inspection/frame.js";
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

  it("restore-pending path via stashed queued frame while pinned", () => {
    const model = modelFor(continuousSpec());
    const { state, reducer, destroy } = mountInspectionController({
      model: () => model,
      registerEffects: false,
    });

    const first = candidateHit(model);
    state.setInspection(first.hit, "pointer", "transient", "xy", first.candidate);
    flushSync();
    state.toggleInspectionPin("pointer");
    flushSync();
    expect(state.inspection?.state).toBe("pinned");

    // Second candidate as pending restore payload.
    let second: CandidateFacts | null = null;
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate !== null && candidate.id !== first.candidate.id) {
        second = candidate;
        break;
      }
    }
    if (second === null) throw new Error("expected a second candidate");
    const pending: QueuedPointerInspection = {
      hit: hitFromCandidate(second),
      source: "pointer",
      concreteMode: "xy",
      candidate: second,
    };
    state.queuePointerFrame(pending, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: {
        epoch: model.runId,
        id: second.id,
        panelId: second.panelId,
        x: second.x,
        y: second.y,
      },
      source: "pointer",
    });
    flushSync();
    // Still pinned — pending was stashed, not applied.
    expect(state.inspection?.state).toBe("pinned");

    state.toggleInspectionPin("pointer");
    flushSync();
    // restore-pending → transient on the stashed second hit.
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.focus.anchor).toEqual({
      x: second.x,
      y: second.y,
    });

    destroy();
  });
});

describe("createInspectionState applyQueuedInspectFrame", () => {
  it("drops stale token, stashes when pinned, applies when fresh, drops on epoch mismatch; always clears queues first", () => {
    const model = modelFor(continuousSpec());
    const announcements: string[] = [];
    const { state, reducer, destroy } = mountInspectionController({
      model: () => model,
      announce: (message) => {
        announcements.push(message);
      },
      registerEffects: false,
    });
    const { candidate, hit } = candidateHit(model);
    const queued: QueuedPointerInspection = {
      hit,
      source: "pointer",
      concreteMode: "xy",
      candidate,
    };
    const frameCandidate = {
      epoch: model.runId,
      id: candidate.id,
      panelId: candidate.panelId,
      x: candidate.x,
      y: candidate.y,
    };

    // Empty frame path: no pending → none; queues stay empty; no inspection.
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: null,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();

    // Stale token → drop (queue cleared before routing).
    state.queuePointerFrame(queued, { epoch: 0, revision: 0 });
    // Advance reducer epoch so token is stale.
    reducer.dispatch({ type: "invalidate", reason: "scene" });
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();
    // Second apply is empty-frame (queues stayed cleared after drop).
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    expect(state.inspection).toBeNull();

    // Fresh token + transient → apply.
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).not.toBeNull();
    expect(state.inspection?.state).toBe("transient");
    // Queues cleared: re-apply is empty.
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: frameCandidate,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection?.state).toBe("transient");

    // Pinned → stash-pending (not apply over pinned).
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
    const otherQueued: QueuedPointerInspection = {
      hit: hitFromCandidate(other),
      source: "pointer",
      concreteMode: "xy",
      candidate: other,
    };
    state.queuePointerFrame(otherQueued, reducer.frameToken());
    const otherFrame = {
      epoch: model.runId,
      id: other.id,
      panelId: other.panelId,
      x: other.x,
      y: other.y,
    };
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: otherFrame,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    // Queues cleared ON the stash path: a second apply must be an empty frame
    // (no double-stash). Discriminator below: restore-pending consumes the
    // SINGLE stash silently, so the NEXT unpin after re-pinning must take the
    // flip branch — which is the only branch that announces "unpinned".
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: otherFrame,
      source: "pointer",
    });
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    // Unpin #1 (keyboard — the announcing source class): restore-pending
    // consumes the stash and never announces; transient lands on the stashed
    // candidate's anchor.
    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(state.inspection?.focus.anchor).toEqual({ x: other.x, y: other.y });
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(false);
    // Re-pin, unpin #2 (keyboard): with the stash gone (single-stash), this
    // is the FLIP branch, which announces for keyboard. A double-stash
    // regression would restore again silently instead.
    state.toggleInspectionPin("keyboard");
    flushSync();
    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(true);

    // Epoch mismatch → drop (from a clean transient base).
    state.setInspection(null, "pointer");
    flushSync();
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({
      type: "inspect",
      candidate: { ...frameCandidate, epoch: model.runId + 999 },
      source: "pointer",
    });
    flushSync();
    expect(state.inspection).toBeNull();

    destroy();
  });

  it("host-facing mutators: clearQueuedPointer drops the payload; clearPendingPinned drops the stash", () => {
    const model = modelFor(continuousSpec());
    const announcements: string[] = [];
    const { state, reducer, destroy } = mountInspectionController({
      model: () => model,
      announce: (message) => {
        announcements.push(message);
      },
      registerEffects: false,
    });
    const { candidate, hit } = candidateHit(model);
    const queued: QueuedPointerInspection = {
      hit,
      source: "pointer",
      concreteMode: "xy",
      candidate,
    };
    const frame = {
      epoch: model.runId,
      id: candidate.id,
      panelId: candidate.panelId,
      x: candidate.x,
      y: candidate.y,
    };

    // clearQueuedPointer clears ONLY the payload (host leave/cancel paths):
    // a fresh-token frame that would otherwise apply must become empty.
    state.queuePointerFrame(queued, reducer.frameToken());
    state.clearQueuedPointer();
    state.applyQueuedInspectFrame({ type: "inspect", candidate: frame, source: "pointer" });
    flushSync();
    expect(state.inspection).toBeNull();

    // clearPendingPinned drops a stashed pending: the next unpin must take
    // the announcing FLIP branch instead of a silent restore.
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({ type: "inspect", candidate: frame, source: "pointer" });
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    state.toggleInspectionPin("pointer");
    flushSync();
    state.queuePointerFrame(queued, reducer.frameToken());
    state.applyQueuedInspectFrame({ type: "inspect", candidate: frame, source: "pointer" });
    flushSync();
    expect(state.inspection?.state).toBe("pinned");
    state.clearPendingPinned();
    announcements.length = 0;
    state.toggleInspectionPin("keyboard");
    flushSync();
    expect(state.inspection?.state).toBe("transient");
    expect(announcements.some((m) => m.includes("unpinned"))).toBe(true);

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
