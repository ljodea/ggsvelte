/**
 * summary_rolling stat — centered rolling-window summaries over continuous x.
 *
 * Contract (see src/stats/summary-rolling.ts): one output row per (group,
 * unique x); each row summarizes y over the window |x − center| ≤ window/2.
 * Partial windows at the series ends are kept (divergence from zoo's default
 * NA padding — a running line should reach both ends of the data).
 */
import { describe, expect, it } from "bun:test";

import { statSummaryRolling } from "../../src/stats/summary-rolling.ts";

describe("statSummaryRolling", () => {
  it("centers the window on each unique x and keeps partial edge windows", () => {
    // window 2 → half-width 1; y = 10x on x = 1..5.
    const x = Float64Array.from([1, 2, 3, 4, 5]);
    const y = Float64Array.from([10, 20, 30, 40, 50]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0, 0, 0],
      params: { window: 2, fun: "mean" },
    });
    expect([...result.x]).toEqual([1, 2, 3, 4, 5]);
    expect([...result.y]).toEqual([15, 20, 30, 40, 45]);
    expect([...result.groups]).toEqual([0, 0, 0, 0, 0]);
    expect(result.dropped).toBe(0);
  });

  it("median averages the two middle values of an even-sized window", () => {
    const x = Float64Array.from([1, 2, 3]);
    const y = Float64Array.from([1, 2, 100]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0],
      params: { window: 2, fun: "median" },
    });
    // center 1 → {1, 2} → 1.5; center 2 → {1, 2, 100} → 2; center 3 → {2, 100} → 51.
    expect([...result.y]).toEqual([1.5, 2, 51]);
  });

  it("includes every row at a duplicated x inside the window", () => {
    const x = Float64Array.from([1, 2, 2, 3]);
    const y = Float64Array.from([10, 20, 40, 60]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0, 0],
      params: { window: 2, fun: "mean" },
    });
    expect([...result.x]).toEqual([1, 2, 3]);
    // center 1 → {10,20,40} = 70/3; center 2 → all four = 32.5; center 3 → {20,40,60} = 40.
    expect(result.y[0]).toBeCloseTo(70 / 3, 9);
    expect(result.y[1]).toBe(32.5);
    expect(result.y[2]).toBe(40);
  });

  it("never lets a window cross groups, even at overlapping x", () => {
    const x = Float64Array.from([1, 2, 3, 1, 2, 3]);
    const y = Float64Array.from([10, 20, 30, 100, 200, 300]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0, 1, 1, 1],
      params: { window: 2, fun: "mean" },
    });
    expect([...result.x]).toEqual([1, 2, 3, 1, 2, 3]);
    expect([...result.y]).toEqual([15, 20, 25, 150, 200, 250]);
    expect([...result.groups]).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it("sorts unsorted x internally and drops rows with missing x or y", () => {
    const x = Float64Array.from([3, 1, 2]);
    const y = Float64Array.from([30, 10, Number.NaN]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0],
      params: { window: 2, fun: "mean" },
    });
    expect(result.dropped).toBe(1);
    expect([...result.x]).toEqual([1, 3]);
    // center 1 → {10}; center 3 → {30} (the dropped row never joins a window).
    expect([...result.y]).toEqual([10, 30]);
  });

  it("carries constant-per-group columns onto the output rows", () => {
    const x = Float64Array.from([1, 2, 3]);
    const y = Float64Array.from([1, 2, 3]);
    const result = statSummaryRolling({
      x,
      y,
      groups: [0, 0, 0],
      carried: { series: ["a", "a", "a"] },
      params: { window: 2, fun: "max" },
    });
    expect(result.carried["series"]).toEqual(["a", "a", "a"]);
  });

  it("fun defaults to mean", () => {
    const x = Float64Array.from([1, 2]);
    const y = Float64Array.from([4, 8]);
    const result = statSummaryRolling({ x, y, groups: [0, 0], params: { window: 2 } });
    expect([...result.y]).toEqual([6, 6]);
  });

  it("throws loudly when window is missing or non-positive", () => {
    const x = Float64Array.from([1, 2]);
    const y = Float64Array.from([4, 8]);
    expect(() => statSummaryRolling({ x, y, groups: [0, 0], params: {} })).toThrow(/window/);
    expect(() => statSummaryRolling({ x, y, groups: [0, 0], params: { window: 0 } })).toThrow(
      /window/,
    );
  });
});
