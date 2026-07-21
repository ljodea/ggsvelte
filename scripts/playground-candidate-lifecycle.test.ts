import { describe, expect, test } from "bun:test";

import {
  acceptCandidatePhase,
  candidateTransitionAccepted,
  createCandidateLifecycleTracker,
  emitPlaygroundCandidatePhase,
  PLAYGROUND_CANDIDATE_EVENT,
  type PlaygroundCandidatePhaseDetail,
} from "../apps/docs/src/lib/playground-candidate-lifecycle";

function detail(
  overrides: Partial<PlaygroundCandidatePhaseDetail> &
    Pick<PlaygroundCandidatePhaseDetail, "phase">,
): PlaygroundCandidatePhaseDetail {
  return {
    generation: 1,
    origin: "apply",
    status: "Checking the next chart before replacing the last valid result.",
    ...overrides,
  };
}

describe("playground candidate lifecycle", () => {
  test("accepts pending → ready → promoted exactly once per generation", () => {
    let tracker = createCandidateLifecycleTracker();
    const pending = acceptCandidatePhase(tracker, detail({ phase: "pending" }));
    expect(pending).not.toBeNull();
    tracker = pending!.tracker;

    const ready = acceptCandidatePhase(
      tracker,
      detail({
        phase: "ready",
        isolation: {
          inert: true,
          inertAttribute: true,
          ariaHidden: "true",
          activeRetained: true,
          activeTitle: "Baseline",
        },
      }),
    );
    expect(ready).not.toBeNull();
    expect(ready!.detail.isolation?.inert).toBe(true);
    tracker = ready!.tracker;

    const promoted = acceptCandidatePhase(
      tracker,
      detail({ phase: "promoted", status: "Rendered custom draft." }),
    );
    expect(promoted).not.toBeNull();
    tracker = promoted!.tracker;

    expect(acceptCandidatePhase(tracker, detail({ phase: "promoted" }))).toBeNull();
    expect(acceptCandidatePhase(tracker, detail({ phase: "failed" }))).toBeNull();
    expect(acceptCandidatePhase(tracker, detail({ phase: "cancelled" }))).toBeNull();
    expect(acceptCandidatePhase(tracker, detail({ phase: "ready" }))).toBeNull();
  });

  test("suppresses duplicate ready and allows cancelled when never promoted", () => {
    let tracker = createCandidateLifecycleTracker();
    tracker = acceptCandidatePhase(tracker, detail({ phase: "pending" }))!.tracker;
    tracker = acceptCandidatePhase(tracker, detail({ phase: "ready" }))!.tracker;
    expect(acceptCandidatePhase(tracker, detail({ phase: "ready" }))).toBeNull();

    const cancelled = acceptCandidatePhase(
      tracker,
      detail({ phase: "cancelled", status: "Draft changed." }),
    );
    expect(cancelled).not.toBeNull();
    expect(cancelled!.detail.phase).toBe("cancelled");
  });

  test("suppresses terminal emission after failed and keeps generations independent", () => {
    let tracker = createCandidateLifecycleTracker();
    tracker = acceptCandidatePhase(tracker, detail({ generation: 1, phase: "pending" }))!.tracker;
    tracker = acceptCandidatePhase(tracker, detail({ generation: 1, phase: "failed" }))!.tracker;
    expect(acceptCandidatePhase(tracker, detail({ generation: 1, phase: "promoted" }))).toBeNull();

    const next = acceptCandidatePhase(
      tracker,
      detail({ generation: 2, origin: "source", phase: "pending" }),
    );
    expect(next).not.toBeNull();
    expect(next!.detail.generation).toBe(2);
  });

  test("candidateTransitionAccepted mirrors reference-equality used by pure state helpers", () => {
    const state = { candidate: null };
    expect(candidateTransitionAccepted(state, state)).toBe(false);
    expect(candidateTransitionAccepted(state, { candidate: null })).toBe(true);
  });

  test("emitPlaygroundCandidatePhase dispatches the documented event name with detail", () => {
    const target = new EventTarget();
    const seen: PlaygroundCandidatePhaseDetail[] = [];
    target.addEventListener(PLAYGROUND_CANDIDATE_EVENT, (event) => {
      seen.push((event as CustomEvent<PlaygroundCandidatePhaseDetail>).detail);
    });
    emitPlaygroundCandidatePhase(detail({ phase: "pending" }), target);
    expect(seen).toEqual([detail({ phase: "pending" })]);
  });
});
