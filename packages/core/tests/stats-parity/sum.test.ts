/**
 * stat_sum — ggplot2 geom_count / stat_sum aligned unit tests.
 */
import { describe, expect, it } from "bun:test";

import { statSum } from "../../src/stats/sum.ts";

describe("statSum", () => {
  it("aggregates coincident (x,y) within a group", () => {
    // R: data.frame(x=c(1,1,1,2,2,3), y=c(1,1,2,2,2,3)) + geom_count
    const result = statSum({
      x: [1, 1, 1, 2, 2, 3],
      y: [1, 1, 2, 2, 2, 3],
      groups: [0, 0, 0, 0, 0, 0],
    });
    expect(result.x).toEqual([1, 1, 2, 3]);
    expect(result.y).toEqual([1, 2, 2, 3]);
    expect([...result.n]).toEqual([2, 1, 2, 1]);
    // prop within single group = n / 6
    expect([...result.prop].map((v) => +v.toFixed(6))).toEqual([
      0.333333, 0.166667, 0.333333, 0.166667,
    ]);
    expect(result.dropped).toBe(0);
  });

  it("computes prop within each colour group (not the whole panel)", () => {
    // R grouped: a has 3 rows → prop 2/3, 1/3; b has 3 → 2/3, 1/3
    const result = statSum({
      x: [1, 1, 1, 2, 2, 3],
      y: [1, 1, 2, 2, 2, 3],
      groups: [0, 0, 0, 1, 1, 1],
    });
    const byGroup = (g: number) =>
      result.groups
        .map((gg, i) => (gg === g ? result.prop[i]! : null))
        .filter((v): v is number => v !== null)
        .map((v) => +v.toFixed(6));
    expect(byGroup(0)).toEqual([0.666667, 0.333333]);
    expect(byGroup(1)).toEqual([0.666667, 0.333333]);
  });

  it("sums weights into n", () => {
    const result = statSum({
      x: [1, 1, 2],
      y: [1, 1, 2],
      groups: [0, 0, 0],
      weights: Float64Array.from([0.5, 1.5, 2]),
    });
    expect([...result.n]).toEqual([2, 2]);
    expect([...result.prop]).toEqual([0.5, 0.5]);
  });

  it("drops null x/y and non-finite weights", () => {
    const result = statSum({
      x: [1, null, 2, 3],
      y: [1, 1, null, 3],
      groups: [0, 0, 0, 0],
      weights: Float64Array.from([1, 1, 1, Number.NaN]),
    });
    expect(result.dropped).toBe(3);
    expect(result.x).toEqual([1]);
    expect([...result.n]).toEqual([1]);
  });
});
