/**
 * Axis-group tables (permutation + bucket boundaries behind `group()`) are
 * built LAZILY: first-hover queries (hitTest/nearest/traverse) must not pay
 * the O(u log u) token-rank sort and O(n) bucket-map construction on dense
 * plots. The build happens once, on first `group()` (or explicit
 * `axisGroups()`), and is memoized.
 *
 * Observable contract pinned here:
 * - indexes expose `axisGroups()` (memoized: identical object identity)
 *   instead of eager `permutations`/`buckets` own-properties;
 * - group() results are unchanged whether or not other queries ran first.
 */
import { describe, expect, it } from "bun:test";

import { buildCandidateStore } from "../../../src/candidate-store.ts";
import { buildCandidateStoreIndexes } from "../../../src/candidate-store-indexes.ts";

import { sceneWithPoints } from "../fixtures.ts";

const POINTS: readonly (readonly [number, number])[] = [
  [10, 10],
  [10, 50],
  [10, 30],
  [40, 20],
  [40, 60],
];

function groupingStore() {
  return buildCandidateStore(sceneWithPoints(POINTS), {
    datum: ({ primitiveIndex }) => ({
      xValue: primitiveIndex < 3 ? "a" : "b",
      yValue: primitiveIndex * 10,
      seriesId: primitiveIndex === 1 ? 1 : 0,
      seriesRank: primitiveIndex === 1 ? 1 : 0,
    }),
  });
}

describe("lazy axis-group tables", () => {
  it("exposes axisGroups() instead of eager permutation/bucket fields", () => {
    const indexes = buildCandidateStoreIndexes(sceneWithPoints(POINTS), {});
    expect("permutations" in indexes).toBe(false);
    expect("buckets" in indexes).toBe(false);
    expect(typeof indexes.axisGroups).toBe("function");
  });

  it("memoizes the build across calls", () => {
    const indexes = buildCandidateStoreIndexes(sceneWithPoints(POINTS), {});
    const first = indexes.axisGroups();
    expect(indexes.axisGroups()).toBe(first);
  });

  it("returns identical group() results whether or not hit queries ran first", () => {
    const groupedFirst = groupingStore();
    const direct = groupedFirst.group(0, "x");

    const hitFirst = groupingStore();
    hitFirst.hitTest(10, 10);
    hitFirst.nearest(10, 10, { mode: "xy", maxDistance: 32 });
    hitFirst.traverse(0, "next");
    const afterQueries = hitFirst.group(0, "x");

    expect(afterQueries).toEqual(direct);
    expect(afterQueries?.memberIds.length).toBeGreaterThan(0);
  });
});
