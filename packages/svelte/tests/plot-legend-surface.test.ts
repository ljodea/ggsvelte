import { describe, expect, it } from "vitest";

import {
  resolveLegendClearControlSource,
  resolveLegendClickAction,
  resolveLegendCommitAction,
  resolveLegendKeyAction,
  resolveLegendPointerUpAction,
  resolveLegendPreviewDismissAction,
  shouldClearLegendPreviewOnBlur,
  shouldRenderInteractionLiveRegion,
  type LegendClearControlInput,
  type LegendClickInput,
  type LegendKeyInput,
  type LegendPointerUpInput,
} from "../src/lib/plot-legend-surface.js";

const key = (overrides: Partial<LegendKeyInput> = {}): LegendKeyInput => ({
  key: "a",
  ...overrides,
});

const pointerUp = (overrides: Partial<LegendPointerUpInput> = {}): LegendPointerUpInput => ({
  pointerType: "touch",
  index: 1,
  touchIndex: 1,
  ...overrides,
});

const click = (overrides: Partial<LegendClickInput> = {}): LegendClickInput => ({
  suppressClick: false,
  detail: 1,
  ...overrides,
});

describe("resolveLegendKeyAction", () => {
  it.each(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"] as const)(
    "routes %s to move with preventDefault",
    (rovingKey) => {
      expect(resolveLegendKeyAction(key({ key: rovingKey }))).toEqual({
        preventDefault: true,
        action: { type: "move", key: rovingKey },
      });
    },
  );

  it.each(["Enter", " "] as const)("routes %s to commit with preventDefault", (commitKey) => {
    expect(resolveLegendKeyAction(key({ key: commitKey }))).toEqual({
      preventDefault: true,
      action: { type: "commit" },
    });
  });

  it("routes Escape to clear with preventDefault", () => {
    expect(resolveLegendKeyAction(key({ key: "Escape" }))).toEqual({
      preventDefault: true,
      action: { type: "clear" },
    });
  });

  it("ignores unrelated keys without preventDefault", () => {
    expect(resolveLegendKeyAction(key({ key: "Tab" }))).toEqual({
      preventDefault: false,
      action: { type: "none" },
    });
    expect(resolveLegendKeyAction(key({ key: "a" }))).toEqual({
      preventDefault: false,
      action: { type: "none" },
    });
  });
});

describe("resolveLegendPointerUpAction", () => {
  it("commits when touch pointerup matches recorded touch index", () => {
    expect(resolveLegendPointerUpAction(pointerUp())).toEqual({ type: "touch-commit" });
  });

  it("returns none when touch index mismatches (stale / other target)", () => {
    expect(resolveLegendPointerUpAction(pointerUp({ index: 2, touchIndex: 1 }))).toEqual({
      type: "none",
    });
  });

  it("returns none when touch index was cancelled or never set (-1)", () => {
    expect(resolveLegendPointerUpAction(pointerUp({ touchIndex: -1 }))).toEqual({
      type: "none",
    });
  });

  it("returns none for non-touch pointer types even when index matches", () => {
    expect(
      resolveLegendPointerUpAction(pointerUp({ pointerType: "mouse", index: 0, touchIndex: 0 })),
    ).toEqual({ type: "none" });
    expect(
      resolveLegendPointerUpAction(pointerUp({ pointerType: "pen", index: 0, touchIndex: 0 })),
    ).toEqual({ type: "none" });
  });
});

describe("resolveLegendClickAction", () => {
  it("suppress outranks commit (touch compatibility click)", () => {
    expect(resolveLegendClickAction(click({ suppressClick: true, detail: 1 }))).toEqual({
      type: "suppress",
    });
    // detail 0 still suppressed — classification does not matter when suppress is set
    expect(resolveLegendClickAction(click({ suppressClick: true, detail: 0 }))).toEqual({
      type: "suppress",
    });
  });

  it("classifies detail === 0 as keyboard source (current host classification)", () => {
    expect(resolveLegendClickAction(click({ detail: 0 }))).toEqual({
      type: "commit",
      source: "keyboard",
    });
  });

  it("classifies detail > 0 as pointer source", () => {
    expect(resolveLegendClickAction(click({ detail: 1 }))).toEqual({
      type: "commit",
      source: "pointer",
    });
    expect(resolveLegendClickAction(click({ detail: 2 }))).toEqual({
      type: "commit",
      source: "pointer",
    });
  });
});

describe("shouldClearLegendPreviewOnBlur", () => {
  it("clears when relatedTarget is null or not a legend target", () => {
    const root = document.createElement("div");
    expect(shouldClearLegendPreviewOnBlur({ relatedTarget: null, root })).toBe(true);
    const other = document.createElement("button");
    expect(shouldClearLegendPreviewOnBlur({ relatedTarget: other, root })).toBe(true);
  });

  it("retains only when the next legend target is inside this plot root", () => {
    const root = document.createElement("div");
    const inside = document.createElement("button");
    inside.dataset.ggLegendTarget = "";
    root.append(inside);
    const outside = document.createElement("button");
    outside.dataset.ggLegendTarget = "";
    document.body.append(outside);
    expect(shouldClearLegendPreviewOnBlur({ relatedTarget: inside, root })).toBe(false);
    expect(shouldClearLegendPreviewOnBlur({ relatedTarget: outside, root })).toBe(true);
    outside.remove();
  });
});

describe("shouldRenderInteractionLiveRegion", () => {
  it("renders for surface tools or legend-only focus", () => {
    expect(
      shouldRenderInteractionLiveRegion({
        surfaceInteractive: false,
        legendFocusEnabled: true,
      }),
    ).toBe(true);
    expect(
      shouldRenderInteractionLiveRegion({
        surfaceInteractive: true,
        legendFocusEnabled: false,
      }),
    ).toBe(true);
    expect(
      shouldRenderInteractionLiveRegion({
        surfaceInteractive: false,
        legendFocusEnabled: false,
      }),
    ).toBe(false);
  });
});

describe("resolveLegendClearControlSource", () => {
  const clear = (overrides: Partial<LegendClearControlInput> = {}): LegendClearControlInput => ({
    detail: 1,
    pointerType: null,
    ...overrides,
  });

  it("classifies detail === 0 as keyboard even when pointerType is touch", () => {
    expect(resolveLegendClearControlSource(clear({ detail: 0, pointerType: null }))).toBe(
      "keyboard",
    );
    expect(resolveLegendClearControlSource(clear({ detail: 0, pointerType: "touch" }))).toBe(
      "keyboard",
    );
  });

  it("classifies touch pointerType when detail > 0", () => {
    expect(resolveLegendClearControlSource(clear({ detail: 1, pointerType: "touch" }))).toBe(
      "touch",
    );
  });

  it("classifies non-touch detail > 0 as pointer", () => {
    expect(resolveLegendClearControlSource(clear({ detail: 1, pointerType: "mouse" }))).toBe(
      "pointer",
    );
    expect(resolveLegendClearControlSource(clear({ detail: 2, pointerType: "pen" }))).toBe(
      "pointer",
    );
    expect(resolveLegendClearControlSource(clear({ detail: 1, pointerType: null }))).toBe(
      "pointer",
    );
  });
});

describe("resolveLegendCommitAction", () => {
  const identity = { scale: "fill", entryIndex: 1 };

  it("toggles clear when pressed identity matches, even with empty keys", () => {
    // Load-bearing: empty keys after domain reshuffle must not fall into ignore.
    expect(
      resolveLegendCommitAction({
        pressed: { scale: "fill", entryIndex: 1 },
        identity,
        keyCount: 0,
      }),
    ).toEqual({ type: "toggle-clear" });
    expect(
      resolveLegendCommitAction({
        pressed: { scale: "fill", entryIndex: 1 },
        identity,
        keyCount: 3,
      }),
    ).toEqual({ type: "toggle-clear" });
  });

  it("ignores empty keys only when not toggling the pressed entry", () => {
    expect(
      resolveLegendCommitAction({
        pressed: null,
        identity,
        keyCount: 0,
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveLegendCommitAction({
        pressed: { scale: "color", entryIndex: 1 },
        identity,
        keyCount: 0,
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveLegendCommitAction({
        pressed: { scale: "fill", entryIndex: 0 },
        identity,
        keyCount: 0,
      }),
    ).toEqual({ type: "ignore" });
  });

  it("commits when keys exist and identity is not already pressed", () => {
    expect(
      resolveLegendCommitAction({
        pressed: null,
        identity,
        keyCount: 2,
      }),
    ).toEqual({ type: "commit" });
  });
});

describe("resolveLegendPreviewDismissAction", () => {
  it("returns none when there is no active preview", () => {
    expect(
      resolveLegendPreviewDismissAction({
        hasActivePreview: false,
        committedEmphasisEmpty: true,
      }),
    ).toEqual({ type: "none" });
    expect(
      resolveLegendPreviewDismissAction({
        hasActivePreview: false,
        committedEmphasisEmpty: false,
      }),
    ).toEqual({ type: "none" });
  });

  it("emits clear only when committed emphasis is empty (not effective/preview)", () => {
    expect(
      resolveLegendPreviewDismissAction({
        hasActivePreview: true,
        committedEmphasisEmpty: true,
      }),
    ).toEqual({ type: "clear-and-emit" });
  });

  it("clears preview without emit when committed emphasis remains", () => {
    expect(
      resolveLegendPreviewDismissAction({
        hasActivePreview: true,
        committedEmphasisEmpty: false,
      }),
    ).toEqual({ type: "clear-only" });
  });
});
