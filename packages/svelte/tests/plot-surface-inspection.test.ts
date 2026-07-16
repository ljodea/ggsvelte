import { describe, expect, it } from "vitest";

import {
  resolveQueuedInspectFrameAction,
  type QueuedInspectFrameInput,
} from "../src/lib/plot-surface-inspection.js";

const frame = (overrides: Partial<QueuedInspectFrameInput> = {}): QueuedInspectFrameInput => ({
  hasPending: true,
  tokenAccepted: true,
  currentState: "none",
  candidateEpochMismatch: false,
  ...overrides,
});

describe("resolveQueuedInspectFrameAction", () => {
  it("returns none when there is no pending payload", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          hasPending: false,
          tokenAccepted: false,
          currentState: "pinned",
          candidateEpochMismatch: true,
        }),
      ),
    ).toEqual({ type: "none" });
  });

  it("drops stale frame tokens before pinned stash or epoch checks", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          tokenAccepted: false,
          currentState: "pinned",
          candidateEpochMismatch: false,
        }),
      ),
    ).toEqual({ type: "drop" });
  });

  it("stashes pending while inspection is pinned (before epoch mismatch)", () => {
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          currentState: "pinned",
          candidateEpochMismatch: true,
        }),
      ),
    ).toEqual({ type: "stash-pending" });
  });

  it("drops on candidate epoch mismatch for non-pinned host states", () => {
    for (const currentState of ["none", "transient"] as const) {
      expect(
        resolveQueuedInspectFrameAction(frame({ currentState, candidateEpochMismatch: true })),
      ).toEqual({ type: "drop" });
    }
  });

  it("applies pending for none/transient when token ok and epoch matches", () => {
    for (const currentState of ["none", "transient"] as const) {
      expect(resolveQueuedInspectFrameAction(frame({ currentState }))).toEqual({
        type: "apply-pending",
      });
    }
  });

  it("priority matrix: pending → token → stash → epoch → apply", () => {
    // no pending wins over everything
    expect(
      resolveQueuedInspectFrameAction(
        frame({
          hasPending: false,
          tokenAccepted: true,
          currentState: "none",
          candidateEpochMismatch: false,
        }),
      ),
    ).toEqual({ type: "none" });

    // rejected token beats pinned stash
    expect(
      resolveQueuedInspectFrameAction(frame({ tokenAccepted: false, currentState: "pinned" })),
    ).toEqual({ type: "drop" });

    // pinned stash beats epoch drop
    expect(
      resolveQueuedInspectFrameAction(
        frame({ currentState: "pinned", candidateEpochMismatch: true }),
      ),
    ).toEqual({ type: "stash-pending" });

    // epoch drop beats apply
    expect(
      resolveQueuedInspectFrameAction(
        frame({ currentState: "transient", candidateEpochMismatch: true }),
      ),
    ).toEqual({ type: "drop" });
  });
});
