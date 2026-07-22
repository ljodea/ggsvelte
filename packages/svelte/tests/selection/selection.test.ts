import { describe, expect, it } from "vitest";

import {
  anchorsFromCandidateKeys,
  buildPointSelectionEvent,
  collectCandidates,
  iterateCandidates,
  mergePresentationFocusKeys,
  nextPointSelectionKeys,
  rowIndexesForCandidate,
  sameOrderedPropertyKeys,
  uniqueKeysFromRowIndexes,
} from "../../src/lib/selection/selection.js";

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

  it("deselects with symbol keys by identity", () => {
    const a = Symbol("a");
    const b = Symbol("b");
    expect(nextPointSelectionKeys([a, b], [a], true)).toEqual([b]);
  });

  // The all-selected deselect path is O(n) via Set membership (currentSet.has /
  // toggledSet.has) rather than an includes-scan. This is a structural property
  // of the implementation; perf-regression coverage lives in the bench-smoke
  // job, not a wall-clock unit assertion (which flakes under CI contention).
  it("deselects a fully-selected set via Set membership", () => {
    const current = Array.from({ length: 1_000 }, (_, i) => i);
    expect(nextPointSelectionKeys(current, current.slice(), true)).toEqual([]);
  });
});

describe("iterateCandidates / collectCandidates", () => {
  function lookup(entries: Array<{ id: number; value: string } | null>): {
    size: number;
    candidate(id: number): { id: number; value: string } | null;
  } {
    return {
      size: entries.length,
      candidate: (id) => entries[id] ?? null,
    };
  }

  it("yields non-null candidates in id-ascending order and skips holes", () => {
    const store = lookup([
      { id: 0, value: "a" },
      null,
      { id: 2, value: "c" },
      null,
      { id: 4, value: "e" },
    ]);
    expect([...iterateCandidates(store)].map((c) => c.value)).toEqual(["a", "c", "e"]);
  });

  it("returns empty for size 0", () => {
    expect([...iterateCandidates(lookup([]))]).toEqual([]);
    expect(collectCandidates(lookup([]), (c) => c.value)).toEqual([]);
  });

  it("projects with collectCandidates without shifting past nulls", () => {
    const store = lookup([{ id: 0, value: "x" }, null, { id: 2, value: "z" }]);
    expect(collectCandidates(store, (c) => c.value.toUpperCase())).toEqual(["X", "Z"]);
  });

  it("does not call project for null slots", () => {
    const store = lookup([null, { id: 1, value: "only" }, null]);
    const seen: number[] = [];
    collectCandidates(store, (c) => {
      seen.push(c.id);
      return c.value;
    });
    expect(seen).toEqual([1]);
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
      { x: 1, y: 2, chrome: "ring" },
      { x: 3, y: 4, chrome: "ring" },
      { x: 5, y: 6, chrome: "ring" },
    ]);
  });

  it("uses String(x):String(y) identity for dedup", () => {
    const dupes = [
      { x: 1, y: 2, keys: ["a"] },
      { x: 1, y: 2, keys: ["a"] },
    ];
    expect(anchorsFromCandidateKeys(dupes, ["a"])).toEqual([{ x: 1, y: 2, chrome: "ring" }]);
  });

  it("marks rect candidates as chrome none", () => {
    expect(
      anchorsFromCandidateKeys(
        [
          { x: 1, y: 2, keys: ["a"], kind: "rects" },
          { x: 3, y: 4, keys: ["b"], kind: "points" },
        ],
        ["a", "b"],
      ),
    ).toEqual([
      { x: 1, y: 2, chrome: "none" },
      { x: 3, y: 4, chrome: "ring" },
    ]);
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

  it("preserves first-seen order for symbol and number keys", () => {
    const a = Symbol("a");
    const b = Symbol("b");
    const keyForRow = (rowIndex: number): PropertyKey | null => {
      if (rowIndex === 0) return a;
      if (rowIndex === 1) return 0;
      if (rowIndex === 2) return b;
      if (rowIndex === 3) return a;
      if (rowIndex === 4) return 0;
      return null;
    };
    expect(uniqueKeysFromRowIndexes([0, 1, 2, 3, 4, 5], keyForRow)).toEqual([a, 0, b]);
  });

  // Dedup uses Set membership (seen.has) rather than an includes-scan, so the
  // all-unique worst case stays O(n). This is a structural property of the
  // implementation; perf-regression coverage lives in the bench-smoke job, not
  // a wall-clock unit assertion (which flakes under CI contention).
  it("dedups an all-unique worst case in first-seen order", () => {
    const n = 5_000;
    const rows = Array.from({ length: n }, (_, i) => i);
    const keys = uniqueKeysFromRowIndexes(rows, (i) => i);
    expect(keys).toHaveLength(n);
    expect(keys[0]).toBe(0);
    expect(keys[n - 1]).toBe(n - 1);
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

describe("mergePresentationFocusKeys", () => {
  it("returns the same emphasis reference when emphasis is empty and inspection is not rect", () => {
    const empty: PropertyKey[] = [];
    expect(mergePresentationFocusKeys(empty, { sourceKeys: ["a"], key: null })).toBe(empty);
    expect(
      mergePresentationFocusKeys(empty, {
        sourceKeys: ["a"],
        key: null,
        kind: "points",
      }),
    ).toBe(empty);
  });

  it("returns the same emphasis reference when inspection is null", () => {
    const emphasis = ["a", "b"] as const;
    expect(mergePresentationFocusKeys(emphasis, null)).toBe(emphasis);
  });

  it("uses inspection keys alone for rect focus when emphasis is empty", () => {
    const empty: PropertyKey[] = [];
    const result = mergePresentationFocusKeys(empty, {
      sourceKeys: ["a", "b"],
      key: "c",
      kind: "rects",
    });
    expect(result).toEqual(["a", "b", "c"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toBe(empty);
  });

  it("unions emphasis then sourceKeys then optional key, dedupes, and freezes", () => {
    const result = mergePresentationFocusKeys(["a"], {
      sourceKeys: ["b", "a"],
      key: "c",
    });
    expect(result).toEqual(["a", "b", "c"]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("omits null focus key and dedupes when key already present", () => {
    expect(mergePresentationFocusKeys(["a"], { sourceKeys: ["b"], key: null })).toEqual(["a", "b"]);
    expect(mergePresentationFocusKeys(["a"], { sourceKeys: ["b"], key: "a" })).toEqual(["a", "b"]);
  });

  it("uses Set/Object.is semantics for symbols", () => {
    const a = Symbol("row");
    const b = Symbol("row");
    const result = mergePresentationFocusKeys([a], {
      sourceKeys: [b, a],
      key: b,
    });
    expect(result).toEqual([a, b]);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
