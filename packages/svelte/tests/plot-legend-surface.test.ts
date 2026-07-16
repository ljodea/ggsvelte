import { describe, expect, it } from "vitest";

import {
  resolveLegendClickAction,
  resolveLegendKeyAction,
  resolveLegendPointerUpAction,
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
