/**
 * Pure unit tests for stat_bin_2d (#799).
 */
import { describe, expect, it } from "bun:test";

import { statBin2d } from "../../src/stats/bin-2d.ts";

describe("statBin2d (#799)", () => {
  it("bins four corner points into four cells with drop=true", () => {
    // Points at corners of [0,2]×[0,2] with bins=2 → one point each corner cell
    const result = statBin2d({
      x: Float64Array.from([0.25, 1.75, 0.25, 1.75]),
      y: Float64Array.from([0.25, 0.25, 1.75, 1.75]),
      groups: [0, 0, 0, 0],
      params: { bins: 2, drop: true },
    });
    expect(result.count.length).toBe(4);
    expect([...result.count].every((c) => c === 1)).toBe(true);
    expect(result.dropped).toBe(0);
  });

  it("drop=false keeps zero-count bins", () => {
    // Span both axes so bins=2 yields a full 2×2 grid.
    const result = statBin2d({
      x: Float64Array.from([0, 2]),
      y: Float64Array.from([0, 2]),
      groups: [0, 0],
      params: { bins: 2, drop: false },
    });
    // 2×2 grid → 4 cells; only two corners occupied (diagonal points)
    expect(result.count.length).toBe(4);
    expect([...result.count].filter((c) => c === 0).length).toBe(2);
    expect([...result.count].filter((c) => c === 1).length).toBe(2);
  });

  it("drop=true (default) omits empty bins", () => {
    const result = statBin2d({
      x: Float64Array.from([0.1]),
      y: Float64Array.from([0.1]),
      groups: [0],
      params: { bins: 3 },
    });
    expect(result.count.length).toBe(1);
    expect(result.count[0]).toBe(1);
  });

  it("drops non-finite coordinates", () => {
    const result = statBin2d({
      x: Float64Array.from([1, NaN, 2]),
      y: Float64Array.from([1, 1, Infinity]),
      groups: [0, 0, 0],
      params: { bins: 2, drop: true },
    });
    expect(result.dropped).toBe(2);
    expect(result.count.length).toBe(1);
  });

  it("weights sum into count", () => {
    const result = statBin2d({
      x: Float64Array.from([0.5, 0.5]),
      y: Float64Array.from([0.5, 0.5]),
      groups: [0, 0],
      weights: Float64Array.from([2, 3]),
      params: { bins: 2, drop: true },
    });
    expect(result.count.length).toBe(1);
    expect(result.count[0]).toBe(5);
  });

  it("emits xmin/xmax/ymin/ymax edges consistent with centers", () => {
    const result = statBin2d({
      x: Float64Array.from([0.5]),
      y: Float64Array.from([0.5]),
      groups: [0],
      params: { bins: 2, drop: true },
    });
    expect(result.x[0]).toBeCloseTo((result.xmin[0]! + result.xmax[0]!) / 2, 10);
    expect(result.y[0]).toBeCloseTo((result.ymin[0]! + result.ymax[0]!) / 2, 10);
    expect(result.xmax[0]! - result.xmin[0]!).toBeGreaterThan(0);
    expect(result.ymax[0]! - result.ymin[0]!).toBeGreaterThan(0);
  });
});
