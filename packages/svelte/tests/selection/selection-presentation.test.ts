import { describe, expect, it } from "vitest";

import {
  buildPointSelectionEvent,
  mergePresentationFocusKeys,
  presentationFocusFromInspection,
  sameOrderedPropertyKeys,
  uniqueKeysFromRowIndexes,
} from "../../src/lib/selection/selection.js";

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

describe("presentationFocusFromInspection (#1080)", () => {
  it("returns null when inspection is null", () => {
    expect(
      presentationFocusFromInspection(null, {
        kind: "points",
        batchIndex: 0,
        primitiveIndex: 1,
      }),
    ).toBeNull();
  });

  it("projects focus keys and seed kind/primitives into PresentationInspectionFocus", () => {
    const focus = presentationFocusFromInspection(
      {
        focus: { sourceKeys: ["a", "b"], key: "a" },
      },
      { kind: "rects", batchIndex: 2, primitiveIndex: 4 },
    );
    expect(focus).toEqual({
      sourceKeys: ["a", "b"],
      key: "a",
      kind: "rects",
      primitives: [{ batchIndex: 2, primitiveIndex: 4 }],
    });
    expect(Object.isFrozen(focus!.primitives)).toBe(true);
  });

  it("uses null kind and empty primitives when seed is absent", () => {
    expect(
      presentationFocusFromInspection({ focus: { sourceKeys: ["k"], key: null } }, null),
    ).toEqual({
      sourceKeys: ["k"],
      key: null,
      kind: null,
      primitives: [],
    });
  });

  it("keeps the same projection across pin state (seed stable, focus keys stable)", () => {
    const seed = { kind: "points", batchIndex: 0, primitiveIndex: 0 };
    const transient = presentationFocusFromInspection(
      { focus: { sourceKeys: ["row-1"], key: "row-1" } },
      seed,
    );
    const pinned = presentationFocusFromInspection(
      { focus: { sourceKeys: ["row-1"], key: "row-1" } },
      seed,
    );
    expect(transient).toEqual(pinned);
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

  it("uses inspection keys alone for rect focus when muteSiblings and emphasis is empty", () => {
    const empty: PropertyKey[] = [];
    const result = mergePresentationFocusKeys(
      empty,
      {
        sourceKeys: ["a", "b"],
        key: "c",
        kind: "rects",
      },
      { muteSiblings: true },
    );
    expect(result).toEqual(["a", "b", "c"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toBe(empty);
  });

  it("ignores rect-only inspection keys when muteSiblings is off (#633)", () => {
    const empty: PropertyKey[] = [];
    expect(
      mergePresentationFocusKeys(
        empty,
        {
          sourceKeys: ["a", "b"],
          key: "c",
          kind: "rects",
        },
        { muteSiblings: false },
      ),
    ).toBe(empty);
    // Default is off — same as muteSiblings: false
    expect(
      mergePresentationFocusKeys(empty, {
        sourceKeys: ["a"],
        key: null,
        kind: "rects",
      }),
    ).toBe(empty);
  });

  it("still unions rect inspection keys with legend emphasis when muteSiblings is off (#633)", () => {
    expect(
      mergePresentationFocusKeys(
        ["legend"],
        { sourceKeys: ["bar"], key: null, kind: "rects" },
        { muteSiblings: false },
      ),
    ).toEqual(["legend", "bar"]);
    expect(
      mergePresentationFocusKeys(["legend"], {
        sourceKeys: ["bar"],
        key: "baz",
        kind: "rects",
      }),
    ).toEqual(["legend", "bar", "baz"]);
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
