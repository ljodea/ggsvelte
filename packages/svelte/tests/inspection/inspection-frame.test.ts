/**
 * Pure unit tests for inspection/frame.ts decision tables.
 */
import { describe, expect, it } from "vitest";

import {
  buildQueuedInspectFrame,
  buildQueuedPointerInspection,
  resolveQueuedInspectFrameAction,
  type QueuedInspectFrameInput,
} from "../../src/lib/inspection/frame.js";

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

describe("buildQueuedPointerInspection", () => {
  const match = {
    id: 3,
    mode: "xy" as const,
    autoMode: "xy" as const,
    layerIndex: 0,
    panelIndex: 0,
    rowIndex: 1,
    lineage: 0,
    x: 10,
    y: 20,
    kind: "point" as const,
  };

  it("omits mode/candidate when nearest match is null", () => {
    expect(
      buildQueuedPointerInspection({
        source: "pointer",
        match: null,
      }),
    ).toEqual({ candidate: null, source: "pointer" });
  });

  it("couples concreteMode and candidate from the same match object", () => {
    expect(
      buildQueuedPointerInspection({
        source: "touch",
        match,
      }),
    ).toEqual({
      source: "touch",
      concreteMode: "xy",
      candidate: match,
    });
  });

  it("propagates exact mode from nearest so pointer path draws no x-crosshair (#770)", () => {
    // CandidateStore.nearest under auto returns mode "exact" for co-layered
    // point hits; concreteMode is what InteractionOverlay / apply use for guides.
    const exactMatch = { ...match, mode: "exact" as const, autoMode: "exact" as const };
    expect(
      buildQueuedPointerInspection({
        source: "pointer",
        match: exactMatch,
      }).concreteMode,
    ).toBe("exact");
  });
});

describe("buildQueuedInspectFrame", () => {
  const match = {
    id: 3,
    mode: "xy" as const,
    autoMode: "xy" as const,
    layerIndex: 1,
    panelIndex: 2,
    panelId: "panel-2",
    rowIndex: 1,
    lineage: 0,
    x: 12,
    y: 24,
    kind: "point" as const,
  };
  const fallback = {
    id: 8,
    epoch: 7,
    candidateIndex: 8,
    batchIndex: 0,
    primitiveIndex: 0,
    layerIndex: 0,
    panelIndex: 0,
    panelId: "p0",
    rowIndex: 9,
    lineage: 0,
    x: 1,
    y: 2,
    xValue: 1,
    yValue: 2,
    xToken: { kind: "number" as const, value: 1 },
    yToken: { kind: "number" as const, value: 2 },
    seriesId: 0,
    seriesRank: 0,
    sourceOrder: 9,
    autoMode: "exact" as const,
    kind: "points" as const,
  };

  it("uses fallback candidate identity when semantic nearest misses", () => {
    let fallbackCalls = 0;
    const built = buildQueuedInspectFrame({
      match: null,
      source: "pointer",
      epoch: 7,
      fallbackCandidate: () => {
        fallbackCalls += 1;
        return fallback;
      },
    });
    expect(fallbackCalls).toBe(1);
    expect(built).toEqual({
      queued: {
        source: "pointer",
        candidate: fallback,
      },
      candidate: {
        epoch: 7,
        id: 8,
        panelId: "p0",
        x: 1,
        y: 2,
      },
    });
  });

  it("builds queued mode + candidate from match without calling fallback", () => {
    let fallbackCalls = 0;
    const built = buildQueuedInspectFrame({
      match,
      source: "touch",
      epoch: 11,
      fallbackCandidate: () => {
        fallbackCalls += 1;
        return fallback;
      },
    });
    expect(fallbackCalls).toBe(0);
    expect(built.queued).toEqual({
      source: "touch",
      concreteMode: "xy",
      candidate: match,
    });
    expect(built.candidate).toEqual({
      epoch: 11,
      id: 3,
      panelId: "panel-2",
      x: 12,
      y: 24,
    });
  });
});
