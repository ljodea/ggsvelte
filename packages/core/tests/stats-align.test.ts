/**
 * Pure stat_align (#815).
 */
import { describe, expect, it } from "bun:test";

import { lerpSeries, seriesFromRows, statAlign } from "../src/stats/align.ts";

describe("lerpSeries", () => {
  it("interpolates between knots and zeros outside range", () => {
    const xs = Float64Array.of(0, 2, 4);
    const ys = Float64Array.of(0, 10, 0);
    expect(lerpSeries(xs, ys, 1)).toBeCloseTo(5, 12);
    expect(lerpSeries(xs, ys, 0)).toBeCloseTo(0, 12);
    expect(lerpSeries(xs, ys, 4)).toBeCloseTo(0, 12);
    expect(lerpSeries(xs, ys, -1)).toBe(0);
    expect(lerpSeries(xs, ys, 5)).toBe(0);
  });
});

describe("seriesFromRows", () => {
  it("last-wins on duplicate x", () => {
    const x = Float64Array.of(1, 1, 2);
    const y = Float64Array.of(3, 9, 4);
    const s = seriesFromRows(x, y, [0, 1, 2]);
    expect(s).not.toBeNull();
    expect([...s!.xs]).toEqual([1, 2]);
    expect([...s!.ys]).toEqual([9, 4]);
  });
});

describe("statAlign", () => {
  it("aligns two groups onto the union x grid with zeros outside range", () => {
    // Group 0: (0,1), (2,3) — missing x=1
    // Group 1: (1,5), (2,7) — missing x=0
    const result = statAlign({
      x: Float64Array.of(0, 2, 1, 2),
      y: Float64Array.of(1, 3, 5, 7),
      groups: [0, 0, 1, 1],
      carried: { g: ["a", "a", "b", "b"] },
    });
    // grid = [0,1,2]; 2 groups × 3 = 6 rows
    expect(result.x.length).toBe(6);
    // group 0 at x=1: lerp(0,1)→(2,3) at 1 → 2
    const g0 = [0, 1, 2].map((i) => result.y[i]!);
    expect(g0[0]).toBeCloseTo(1, 12);
    expect(g0[1]).toBeCloseTo(2, 12);
    expect(g0[2]).toBeCloseTo(3, 12);
    // group 1 at x=0: outside → 0
    const g1 = [3, 4, 5].map((i) => result.y[i]!);
    expect(g1[0]).toBe(0);
    expect(g1[1]).toBeCloseTo(5, 12);
    expect(g1[2]).toBeCloseTo(7, 12);
    // carried first-seen per group
    expect(result.carried.g![0]).toBe("a");
    expect(result.carried.g![3]).toBe("b");
  });
});
