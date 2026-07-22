/**
 * Pure unit tests for inspection/apply.ts decision tables.
 */
import { describe, expect, it } from "vitest";

import {
  resolveInspectionCompleteness,
  resolveInspectionMode,
  resolveSetInspectionAction,
  resolveToggleInspectionPinAction,
  shouldAnnounceUnpin,
  shouldClearInspectionAnnouncement,
  shouldFocusPinnedInteractiveTooltip,
  type SetInspectionInput,
  type ToggleInspectionPinInput,
} from "../../src/lib/inspection/apply.js";

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

  it("clears when no hit and not blocked; emitClear only when currentState is not none", () => {
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "pinned",
          currentState: "none",
          tooltipHovered: false,
        }),
      ),
    ).toEqual({ type: "clear", emitClear: false });
    expect(
      resolveSetInspectionAction(
        setInput({
          hasHit: false,
          requestedState: "transient",
          currentState: "transient",
        }),
      ),
    ).toEqual({ type: "clear", emitClear: true });
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

const samplePending = {
  hit: null,
  source: "pointer" as const,
  concreteMode: "exact" as const,
};

const toggleInput = (
  overrides: Partial<ToggleInspectionPinInput> = {},
): ToggleInspectionPinInput => ({
  hasInspection: true,
  hasSeed: true,
  currentState: "transient",
  pending: null,
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

  it("restores pending only when pinned with a non-null pending payload", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          pending: samplePending,
        }),
      ),
    ).toEqual({ type: "restore-pending", pending: samplePending });
  });

  it("does not restore pending while transient even if pending exists", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "transient",
          pending: samplePending,
        }),
      ),
    ).toEqual({ type: "flip", state: "pinned" });
  });

  it("flips pinned → transient when pending is null", () => {
    expect(
      resolveToggleInspectionPinAction(
        toggleInput({
          currentState: "pinned",
          pending: null,
        }),
      ),
    ).toEqual({ type: "flip", state: "transient" });
  });

  it("flips transient → pinned", () => {
    expect(resolveToggleInspectionPinAction(toggleInput({ currentState: "transient" }))).toEqual({
      type: "flip",
      state: "pinned",
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

describe("shouldAnnounceUnpin / shouldFocusPinnedInteractiveTooltip", () => {
  it("announces unpin only for transient keyboard/touch", () => {
    expect(shouldAnnounceUnpin({ state: "transient", source: "keyboard" })).toBe(true);
    expect(shouldAnnounceUnpin({ state: "transient", source: "touch" })).toBe(true);
    expect(shouldAnnounceUnpin({ state: "transient", source: "pointer" })).toBe(false);
    expect(shouldAnnounceUnpin({ state: "pinned", source: "keyboard" })).toBe(false);
  });

  it("focuses tooltip only when pinned with interactive content", () => {
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "pinned",
        contentMode: "interactive",
      }),
    ).toBe(true);
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "pinned",
        contentMode: "informational",
      }),
    ).toBe(false);
    expect(
      shouldFocusPinnedInteractiveTooltip({
        state: "transient",
        contentMode: "interactive",
      }),
    ).toBe(false);
  });
});
