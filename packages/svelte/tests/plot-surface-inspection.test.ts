import { describe, expect, it } from "vitest";

import {
  resolveInspectionCompleteness,
  resolveInspectionMode,
  resolveQueuedInspectFrameAction,
  resolveSetInspectionAction,
  resolveToggleInspectionPinAction,
  shouldClearInspectionAnnouncement,
  shouldCommitInspection,
  type QueuedInspectFrameInput,
  type SetInspectionInput,
  type ToggleInspectionPinInput,
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

const setInput = (overrides: Partial<SetInspectionInput> = {}): SetInspectionInput => ({
  hasHit: true,
  requestedState: "transient",
  currentState: "none",
  tooltipHovered: false,
  ...overrides,
});

describe("shouldClearInspectionAnnouncement", () => {
  it("clears only for non-null hit from keyboard or touch", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "keyboard" })).toBe(true);
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "touch" })).toBe(true);
  });

  it("does not clear for pointer or programmatic even with a hit", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: true, source: "pointer" })).toBe(false);
    expect(
      shouldClearInspectionAnnouncement({
        hasHit: true,
        source: "programmatic",
      }),
    ).toBe(false);
  });

  it("does not clear when there is no hit (even keyboard)", () => {
    expect(shouldClearInspectionAnnouncement({ hasHit: false, source: "keyboard" })).toBe(false);
    expect(shouldClearInspectionAnnouncement({ hasHit: false, source: "touch" })).toBe(false);
  });
});

describe("resolveSetInspectionAction", () => {
  it("ignores transient requests while pinned (even with a hit)", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "transient",
          currentState: "pinned",
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("ignores clear when tooltip is hovered", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "transient",
          tooltipHovered: true,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("ignores clear while pinned even for pinned requests", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "pinned",
          currentState: "pinned",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });

  it("clears when no hit and not blocked (including pinned request)", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "pinned",
          currentState: "none",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "clear" });
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "transient",
        }),
      ),
    ).toEqual({ type: "clear" });
  });

  it("applies when there is a hit and not pinned-blocking-transient", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "pinned",
          currentState: "pinned",
        }),
      ),
    ).toEqual({ type: "apply" });
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: true,
          requestedState: "transient",
          currentState: "none",
        }),
      ),
    ).toEqual({ type: "apply" });
  });

  it("priority: pinned+transient ignore beats clear and apply", () => {
    // no hit + pinned + transient → ignore (gate 1), not clear
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "pinned",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "ignore" });
  });
});

describe("shouldCommitInspection", () => {
  it("commits when reducer kind matches requested state", () => {
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "transient",
      }),
    ).toBe(true);
    expect(
      shouldCommitInspection({
        requestedState: "pinned",
        reducerKind: "pinned",
      }),
    ).toBe(true);
  });

  it("abandons when reducer kind does not match requested state", () => {
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "pinned",
      }),
    ).toBe(false);
    expect(
      shouldCommitInspection({
        requestedState: "pinned",
        reducerKind: "transient",
      }),
    ).toBe(false);
    expect(
      shouldCommitInspection({
        requestedState: "transient",
        reducerKind: "none",
      }),
    ).toBe(false);
  });
});

const toggleInput = (
  overrides: Partial<ToggleInspectionPinInput> = {},
): ToggleInspectionPinInput => ({
  hasInspection: true,
  hasSeed: true,
  currentState: "transient",
  hasPendingPinned: false,
  ...overrides,
});

describe("resolveToggleInspectionPinAction", () => {
  it("ignores without inspection or seed", () => {
    expect(
      resolveToggleInspectionPinAction(toggleInput({ hasInspection: false, hasSeed: true })),
    ).toEqual({ type: "ignore" });
    expect(
      resolveToggleInspectionPinAction(toggleInput({ hasInspection: true, hasSeed: false })),
    ).toEqual({ type: "ignore" });
  });

  it("restores pending only when pinned with a pending payload", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          hasPendingPinned: true,
        }),
      ),
    ).toEqual({ type: "restore-pending" });
  });

  it("does not restore pending while transient even if pending exists", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "transient",
          hasPendingPinned: true,
        }),
      ),
    ).toEqual({ type: "flip-to-pinned" });
  });

  it("flips pinned → transient when no pending", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          hasPendingPinned: false,
        }),
      ),
    ).toEqual({ type: "flip-to-transient" });
  });

  it("flips transient → pinned", () => {
    expect(resolveToggleInspectionPinAction(toggleInput({ currentState: "transient" }))).toEqual({
      type: "flip-to-pinned",
    });
  });
});

describe("resolveInspectionCompleteness", () => {
  it("is complete when pinned regardless of callbacks", () => {
    expect(
      resolveInspectionCompleteness({
        state: "pinned",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
  });

  it("is complete when any content/callback flag is true", () => {
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: true,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: true,
        hasInteractionCallback: false,
      }),
    ).toBe("complete");
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: true,
      }),
    ).toBe("complete");
  });

  it("is transient only when unpinned and all flags false", () => {
    expect(
      resolveInspectionCompleteness({
        state: "transient",
        hasCustomContent: false,
        hasInspectCallback: false,
        hasInteractionCallback: false,
      }),
    ).toBe("transient");
  });
});

describe("resolveInspectionMode", () => {
  it("prefers concreteMode when provided", () => {
    expect(
      resolveInspectionMode({
        concreteMode: "x",
        requested: "auto",
        seedAutoMode: "xy",
      }),
    ).toBe("x");
    expect(
      resolveInspectionMode({
        concreteMode: "exact",
        requested: "y",
        seedAutoMode: "xy",
      }),
    ).toBe("exact");
  });

  it("uses seed autoMode when requested is auto", () => {
    expect(
      resolveInspectionMode({
        concreteMode: undefined,
        requested: "auto",
        seedAutoMode: "y",
      }),
    ).toBe("y");
  });

  it("uses requested mode when not auto and no concrete", () => {
    expect(
      resolveInspectionMode({
        concreteMode: undefined,
        requested: "xy",
        seedAutoMode: "exact",
      }),
    ).toBe("xy");
  });
});
