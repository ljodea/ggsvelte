import { describe, expect, it } from "vitest";

import {
  anchorsFromCandidateKeys,
  buildPointSelectionEvent,
  nextPointSelectionKeys,
  rowIndexesForCandidate,
  sameOrderedPropertyKeys,
  uniqueKeysFromRowIndexes,
} from "../src/lib/plot-selection.js";

describe("nextPointSelectionKeys", () => {
  it("no-ops on empty toggle input", () => {
    expect(nextPointSelectionKeys(["a"], [], true)).toEqual(["a"]);
  });

  it("removes keys when every toggled key is already selected", () => {
    expect(nextPointSelectionKeys(["a", "b", "c"], ["a", "c"], true)).toEqual(["b"]);
  });

  it("unions keys in multiple mode when not all are selected", () => {
    expect(nextPointSelectionKeys(["a"], ["a", "b"], true)).toEqual(["a", "b"]);
    expect(nextPointSelectionKeys(["a"], ["b"], true)).toEqual(["a", "b"]);
  });

  it("replaces selection in single mode", () => {
    expect(nextPointSelectionKeys(["a", "b"], ["c"], false)).toEqual(["c"]);
    // partial overlap still not "all selected"
    expect(nextPointSelectionKeys(["a", "b"], ["a", "c"], false)).toEqual(["a", "c"]);
  });

  it("deduplicates union results", () => {
    expect(nextPointSelectionKeys(["a", "a"], ["b", "b"], true)).toEqual(["a", "b"]);
  });
});

describe("anchorsFromCandidateKeys", () => {
  const candidates = [
    { x: 1, y: 2, keys: ["a"] },
    { x: 3, y: 4, keys: ["b"] },
    { x: 1, y: 2, keys: ["c"] }, // same anchor as first
    { x: 5, y: 6, keys: ["a", "d"] },
    { x: 7, y: 8, keys: [] },
  ];

  it("returns empty when nothing is selected", () => {
    expect(anchorsFromCandidateKeys(candidates, [])).toEqual([]);
  });

  it("collects anchors in id-ascending order and dedups by coordinate identity", () => {
    expect(anchorsFromCandidateKeys(candidates, ["a", "b"])).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]);
  });

  it("uses String(x):String(y) identity for dedup", () => {
    const dupes = [
      { x: 1, y: 2, keys: ["a"] },
      { x: 1, y: 2, keys: ["a"] },
    ];
    expect(anchorsFromCandidateKeys(dupes, ["a"])).toEqual([{ x: 1, y: 2 }]);
  });
});

describe("rowIndexesForCandidate", () => {
  it("preserves lineage order and appends rowIndex only if absent", () => {
    expect(rowIndexesForCandidate({ rowIndex: 9 }, [3, 1, 4])).toEqual([3, 1, 4, 9]);
    expect(rowIndexesForCandidate({ rowIndex: 1 }, [3, 1, 4])).toEqual([3, 1, 4]);
    expect(rowIndexesForCandidate({ rowIndex: null }, [3, 1])).toEqual([3, 1]);
  });
});

describe("uniqueKeysFromRowIndexes", () => {
  it("keeps first-seen non-null keys and skips nulls", () => {
    const keyForRow = (rowIndex: number): PropertyKey | null => {
      if (rowIndex === 1) return "a";
      if (rowIndex === 2) return null;
      if (rowIndex === 3) return "b";
      if (rowIndex === 4) return "a";
      return "c";
    };
    expect(uniqueKeysFromRowIndexes([1, 2, 3, 4, 5], keyForRow)).toEqual(["a", "b", "c"]);
  });

  it("returns empty for empty input", () => {
    expect(uniqueKeysFromRowIndexes([], () => "x")).toEqual([]);
  });
});

describe("sameOrderedPropertyKeys", () => {
  it("requires matching length and Object.is per index", () => {
    expect(sameOrderedPropertyKeys(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrderedPropertyKeys(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameOrderedPropertyKeys(["a"], ["a", "b"])).toBe(false);
    expect(sameOrderedPropertyKeys([0], [-0])).toBe(false);
  });

  it("treats distinct symbols as unequal even with the same description", () => {
    const a = Symbol("k");
    const b = Symbol("k");
    expect(sameOrderedPropertyKeys([a], [a])).toBe(true);
    expect(sameOrderedPropertyKeys([a], [b])).toBe(false);
  });

  it("does not dedupe — caller normalizes first", () => {
    expect(sameOrderedPropertyKeys(["a", "a"], ["a"])).toBe(false);
  });
});

describe("buildPointSelectionEvent", () => {
  it("builds a frozen end payload and clones keys", () => {
    const keys = ["a", "b"];
    const event = buildPointSelectionEvent(keys, "pointer");
    expect(event).toEqual({
      type: "select",
      phase: "end",
      mode: "point",
      keys: ["a", "b"],
      source: "pointer",
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.keys)).toBe(true);
    keys.push("c");
    expect(event.keys).toEqual(["a", "b"]);
  });

  it("uses clear phase when keys are empty", () => {
    const event = buildPointSelectionEvent([], "keyboard");
    expect(event.phase).toBe("clear");
    expect(event.keys).toEqual([]);
    expect(Object.isFrozen(event.keys)).toBe(true);
  });
});
