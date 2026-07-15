import { describe, expect, it } from "vitest";

import { anchorsFromCandidateKeys, nextPointSelectionKeys } from "../src/lib/plot-selection.js";

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
