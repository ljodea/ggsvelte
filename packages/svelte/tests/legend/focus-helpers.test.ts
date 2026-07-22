import { describe, expect, it } from "vitest";

import {
  buildInteractiveLegendEntries,
  clampLegendRovingIndex,
  keysForLegendEntry,
  legendIdentityKey,
  legendInteractionSource,
  moveLegendRovingIndex,
  samePropertyKeySet,
  type InteractiveLegendEntry,
} from "../../src/lib/legend/focus.js";
import { discreteColor, discreteFill, ramp } from "./focus-fixtures.js";

describe("legendInteractionSource", () => {
  it("keeps pointer and touch", () => {
    expect(legendInteractionSource("pointer")).toBe("pointer");
    expect(legendInteractionSource("touch")).toBe("touch");
  });

  it("maps focus and keyboard to keyboard", () => {
    expect(legendInteractionSource("focus")).toBe("keyboard");
    expect(legendInteractionSource("keyboard")).toBe("keyboard");
  });
});

describe("legendIdentityKey", () => {
  it("joins scale and entryIndex", () => {
    expect(legendIdentityKey({ scale: "fill", entryIndex: 2 })).toBe("fill:2");
  });
});

describe("moveLegendRovingIndex", () => {
  it("returns 0 for empty lists", () => {
    expect(moveLegendRovingIndex(0, "ArrowRight", 0)).toBe(0);
  });

  it("moves without wrapping", () => {
    expect(moveLegendRovingIndex(0, "ArrowRight", 3)).toBe(1);
    expect(moveLegendRovingIndex(2, "ArrowRight", 3)).toBe(2);
    expect(moveLegendRovingIndex(0, "ArrowLeft", 3)).toBe(0);
    expect(moveLegendRovingIndex(2, "ArrowUp", 3)).toBe(1);
    expect(moveLegendRovingIndex(1, "ArrowDown", 3)).toBe(2);
  });

  it("handles Home, End, and unknown keys", () => {
    expect(moveLegendRovingIndex(2, "Home", 4)).toBe(0);
    expect(moveLegendRovingIndex(0, "End", 4)).toBe(3);
    expect(moveLegendRovingIndex(1, "Tab", 4)).toBe(1);
    expect(moveLegendRovingIndex(99, "Tab", 4)).toBe(3);
  });
});

describe("keysForLegendEntry", () => {
  it("returns frozen keys or empty for missing identities", () => {
    const index = new Map<string, readonly PropertyKey[]>([["fill:0", Object.freeze(["a", "c"])]]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 0 })).toEqual(["a", "c"]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 1 })).toEqual([]);
  });
});

describe("clampLegendRovingIndex", () => {
  it("returns 0 for empty lists and non-finite input", () => {
    expect(clampLegendRovingIndex(3, 0)).toBe(0);
    expect(clampLegendRovingIndex(Number.NaN, 4)).toBe(0);
  });

  it("clamps into [0, count)", () => {
    expect(clampLegendRovingIndex(-2, 4)).toBe(0);
    expect(clampLegendRovingIndex(1, 4)).toBe(1);
    expect(clampLegendRovingIndex(99, 4)).toBe(3);
  });
});

describe("buildInteractiveLegendEntries", () => {
  it("lists only discrete entries in legend then entry order", () => {
    const entries = buildInteractiveLegendEntries([discreteFill, ramp, discreteColor]);
    expect(entries.map((entry) => legendIdentityKey(entry.identity))).toEqual([
      "fill:0",
      "fill:1",
      "color:0",
    ]);
    expect(entries[0]?.entry.label).toBe("Web");
    expect(entries[2]?.entry.label).toBe("A");
  });

  it("returns empty for ramp-only legends", () => {
    expect(buildInteractiveLegendEntries([ramp])).toEqual([]);
  });
});

describe("samePropertyKeySet", () => {
  it("treats equal membership as equal regardless of order", () => {
    expect(samePropertyKeySet(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("treats duplicate-tolerant sets as equal", () => {
    expect(samePropertyKeySet(["a", "a"], ["a"])).toBe(true);
    expect(samePropertyKeySet(["a", "a"], ["a", "b"])).toBe(false);
  });

  it("distinguishes symbols with the same description", () => {
    const left = Symbol("row");
    const right = Symbol("row");
    expect(samePropertyKeySet([left], [right])).toBe(false);
    expect(samePropertyKeySet([left], [left])).toBe(true);
  });

  it("returns false for different lengths of unique keys", () => {
    expect(samePropertyKeySet(["a"], ["a", "b"])).toBe(false);
  });
});

describe("InteractiveLegendEntry typing smoke", () => {
  it("exposes identity and entry for host action builders", () => {
    const entries: InteractiveLegendEntry[] = buildInteractiveLegendEntries([discreteFill]);
    const first = entries[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const action = {
      identity: first.identity,
      entry: first.entry,
      source: "keyboard" as const,
    };
    expect(action.entry.label).toBe("Web");
  });
});
