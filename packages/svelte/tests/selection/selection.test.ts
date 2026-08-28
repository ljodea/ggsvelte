import { describe, expect, it } from "vitest";

import {
  anchorsFromCandidateKeys,
  applyEmphasisRingDensityGate,
  collectCandidates,
  EMPHASIS_RING_DENSITY_LIMIT,
  iterateCandidates,
  nextPointSelectionKeys,
  hoverChromeForKind,
  presentationChromeForKind,
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

describe("presentationChromeForKind", () => {
  it("rings points, boxes glyphs, mute-only elsewhere for selection/emphasis", () => {
    expect(presentationChromeForKind("points")).toBe("ring");
    expect(presentationChromeForKind()).toBe("none");
    expect(presentationChromeForKind(null)).toBe("none");
    expect(presentationChromeForKind("rects")).toBe("none");
    expect(presentationChromeForKind("paths")).toBe("none");
    expect(presentationChromeForKind("segments")).toBe("none");
    expect(presentationChromeForKind("glyphs")).toBe("box");
  });
});

describe("hoverChromeForKind", () => {
  it("keeps rings for strokes and points; boxes glyphs; rects mute only", () => {
    expect(hoverChromeForKind("points")).toBe("ring");
    expect(hoverChromeForKind("paths")).toBe("ring");
    expect(hoverChromeForKind("segments")).toBe("ring");
    expect(hoverChromeForKind("glyphs")).toBe("box");
    expect(hoverChromeForKind()).toBe("ring");
    expect(hoverChromeForKind(null)).toBe("ring");
    expect(hoverChromeForKind("rects")).toBe("none");
  });

  it("mutes closed path fills; open paths keep the ring (#1270)", () => {
    expect(hoverChromeForKind("paths", true)).toBe("none");
    expect(hoverChromeForKind("paths", false)).toBe("ring");
    // closedPath only applies to paths — other kinds are unchanged.
    expect(hoverChromeForKind("points", true)).toBe("ring");
    expect(hoverChromeForKind("rects", true)).toBe("none");
  });
});

describe("anchorsFromCandidateKeys", () => {
  const candidates = [
    { x: 1, y: 2, keys: ["a"], kind: "points" },
    { x: 3, y: 4, keys: ["b"], kind: "points" },
    { x: 1, y: 2, keys: ["c"], kind: "points" }, // same anchor as first
    { x: 5, y: 6, keys: ["a", "d"], kind: "points" },
    { x: 7, y: 8, keys: [], kind: "points" },
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
      { x: 1, y: 2, keys: ["a"], kind: "points" },
      { x: 1, y: 2, keys: ["a"], kind: "points" },
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

  it("marks path and segment candidates as chrome none", () => {
    expect(
      anchorsFromCandidateKeys(
        [
          { x: 1, y: 2, keys: ["a"], kind: "paths" },
          { x: 3, y: 4, keys: ["b"], kind: "segments" },
        ],
        ["a", "b"],
      ),
    ).toEqual([
      { x: 1, y: 2, chrome: "none" },
      { x: 3, y: 4, chrome: "none" },
    ]);
  });

  it("marks glyph (text/label) candidates as chrome box", () => {
    expect(
      anchorsFromCandidateKeys(
        [
          { x: 1, y: 2, keys: ["a"], kind: "glyphs" },
          { x: 3, y: 4, keys: ["b"], kind: "points" },
        ],
        ["a", "b"],
      ),
    ).toEqual([
      { x: 1, y: 2, chrome: "box" },
      { x: 3, y: 4, chrome: "ring" },
    ]);
  });

  it("prefers ring chrome when a point and rect share an anchor", () => {
    expect(
      anchorsFromCandidateKeys(
        [
          { x: 1, y: 2, keys: ["a"], kind: "rects" },
          { x: 1, y: 2, keys: ["a"], kind: "points" },
        ],
        ["a"],
      ),
    ).toEqual([{ x: 1, y: 2, chrome: "ring" }]);
  });

  it("prefers box chrome when a glyph and rect share an anchor", () => {
    expect(
      anchorsFromCandidateKeys(
        [
          { x: 1, y: 2, keys: ["a"], kind: "rects" },
          { x: 1, y: 2, keys: ["a"], kind: "glyphs" },
        ],
        ["a"],
      ),
    ).toEqual([{ x: 1, y: 2, chrome: "box" }]);
  });
});

describe("applyEmphasisRingDensityGate", () => {
  it("keeps point rings when the ring count is within the limit", () => {
    const anchors = Array.from({ length: EMPHASIS_RING_DENSITY_LIMIT }, (_, i) => ({
      x: i,
      y: 0,
      chrome: "ring" as const,
    }));
    expect(applyEmphasisRingDensityGate(anchors)).toBe(anchors);
    expect(applyEmphasisRingDensityGate(anchors).every((a) => a.chrome === "ring")).toBe(true);
  });

  it("demotes all rings to none when ring count exceeds the density limit", () => {
    const anchors = Array.from({ length: EMPHASIS_RING_DENSITY_LIMIT + 1 }, (_, i) => ({
      x: i,
      y: 0,
      chrome: "ring" as const,
    }));
    const gated = applyEmphasisRingDensityGate(anchors);
    expect(gated).toHaveLength(EMPHASIS_RING_DENSITY_LIMIT + 1);
    expect(gated.every((a) => a.chrome === "none")).toBe(true);
    expect(gated).not.toBe(anchors);
  });

  it("counts only ring chrome toward the density limit", () => {
    const anchors = [
      ...Array.from({ length: EMPHASIS_RING_DENSITY_LIMIT }, (_, i) => ({
        x: i,
        y: 0,
        chrome: "ring" as const,
      })),
      { x: 999, y: 0, chrome: "none" as const },
    ];
    // ring count === limit → keep rings; the none anchor does not push over
    expect(applyEmphasisRingDensityGate(anchors).filter((a) => a.chrome === "ring")).toHaveLength(
      EMPHASIS_RING_DENSITY_LIMIT,
    );
  });

  it("accepts an explicit maxRingAnchors override", () => {
    const anchors = [
      { x: 0, y: 0, chrome: "ring" as const },
      { x: 1, y: 0, chrome: "ring" as const },
      { x: 2, y: 0, chrome: "ring" as const },
    ];
    expect(applyEmphasisRingDensityGate(anchors, 2).every((a) => a.chrome === "none")).toBe(true);
    expect(applyEmphasisRingDensityGate(anchors, 3).every((a) => a.chrome === "ring")).toBe(true);
  });
});
