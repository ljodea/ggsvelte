/**
 * Ring-cut windowing — shared by SVG pathData, canvas tracing, hit-testing,
 * and coord projection. Every caller used to rescan the whole batch-wide
 * ringStarts array per subpath; these tests pin the window semantics so the
 * binary-search version stays identical to the linear filter it replaced.
 */
import { describe, expect, it } from "bun:test";

import { ringCuts } from "../src/ring-cuts.ts";

/** The linear filter every call site carried before ringCuts existed. */
function linearCuts(ringStarts: ArrayLike<number>, start: number, end: number): number[] {
  const cuts: number[] = [start];
  for (let i = 0; i < ringStarts.length; i++) {
    const b = ringStarts[i]!;
    if (b > start && b < end) cuts.push(b);
  }
  cuts.push(end);
  return cuts;
}

describe("ringCuts", () => {
  it("returns just the window when no break falls inside it", () => {
    expect(ringCuts([], 0, 10)).toEqual([0, 10]);
    expect(ringCuts([20, 30], 0, 10)).toEqual([0, 10]);
  });

  it("keeps breaks strictly inside the window, in ascending order", () => {
    expect(ringCuts([3, 6], 0, 10)).toEqual([0, 3, 6, 10]);
  });

  it("excludes breaks equal to either boundary", () => {
    expect(ringCuts([0, 5, 10], 0, 10)).toEqual([0, 5, 10]);
  });

  it("ignores breaks belonging to earlier and later subpaths", () => {
    const ringStarts = [2, 7, 14, 19, 26];
    expect(ringCuts(ringStarts, 10, 20)).toEqual([10, 14, 19, 20]);
  });

  it("handles the first and last subpath windows", () => {
    const ringStarts = [3, 12, 21];
    expect(ringCuts(ringStarts, 0, 10)).toEqual([0, 3, 10]);
    expect(ringCuts(ringStarts, 20, 30)).toEqual([20, 21, 30]);
  });

  it("accepts a typed array, matching what PathsBatch carries", () => {
    expect(ringCuts(Uint32Array.from([4, 9]), 0, 12)).toEqual([0, 4, 9, 12]);
  });

  it("degenerate windows still return a well-formed pair", () => {
    expect(ringCuts([5], 7, 7)).toEqual([7, 7]);
  });

  it("matches the linear filter on every window of an ascending array", () => {
    const ringStarts = [2, 5, 9, 9, 13, 21, 34, 55];
    for (let start = 0; start <= 60; start++) {
      for (let end = start; end <= 60; end += 7) {
        expect(ringCuts(ringStarts, start, end)).toEqual(linearCuts(ringStarts, start, end));
      }
    }
  });
});
