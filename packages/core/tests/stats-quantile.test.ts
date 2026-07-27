/**
 * Pure stat_quantile / linear RQ unit tests (#805).
 */
import { describe, expect, it } from "bun:test";

import {
  empiricalQuantileOrderStat,
  fitLinearQuantileRegression,
  pinballLoss,
  statQuantile,
} from "../src/stats/quantile.js";

describe("empiricalQuantileOrderStat", () => {
  it("returns the ceil(τn)-th order statistic (pinball-minimizing)", () => {
    // sorted would be 1,2,3,4,5; τ=0.5, n=5 → ceil(2.5)=3 → 3rd = 3
    expect(empiricalQuantileOrderStat([5, 1, 3, 2, 4], 0.5)).toBe(3);
  });

  it("handles τ near 0 and 1", () => {
    expect(empiricalQuantileOrderStat([10, 20, 30], 0.01)).toBe(10);
    expect(empiricalQuantileOrderStat([10, 20, 30], 0.99)).toBe(30);
  });
});

describe("pinballLoss", () => {
  it("is zero for exact residuals at any τ when residuals are zero", () => {
    expect(pinballLoss([0, 0, 0], 0.5)).toBe(0);
  });

  it("penalizes under- and over-prediction asymmetrically", () => {
    // residual +1 at τ=0.25 → 0.25; residual -1 → 0.75
    expect(pinballLoss([1], 0.25)).toBeCloseTo(0.25, 10);
    expect(pinballLoss([-1], 0.25)).toBeCloseTo(0.75, 10);
  });
});

describe("fitLinearQuantileRegression", () => {
  it("recovers exact collinear y = 1 + 2x for every τ", () => {
    const x = Float64Array.from([0, 1, 2, 3, 4]);
    const y = Float64Array.from([1, 3, 5, 7, 9]);
    for (const tau of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const fit = fitLinearQuantileRegression(x, y, tau);
      expect(fit).not.toBeNull();
      expect(fit!.intercept).toBeCloseTo(1, 8);
      expect(fit!.slope).toBeCloseTo(2, 8);
    }
  });

  it("satisfies the QR residual subgradient condition", () => {
    // Slight noise around y = x
    const x = Float64Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    const y = Float64Array.from([0.1, 0.9, 2.2, 2.8, 4.1, 4.9, 6.0, 7.2]);
    const tau = 0.5;
    const fit = fitLinearQuantileRegression(x, y, tau)!;
    let below = 0;
    let equal = 0;
    let above = 0;
    for (let i = 0; i < x.length; i++) {
      const r = y[i]! - (fit.intercept + fit.slope * x[i]!);
      if (r < -1e-9) below++;
      else if (r > 1e-9) above++;
      else equal++;
    }
    const n = x.length;
    // #{r < 0} ≤ τn ≤ #{r ≤ 0}
    expect(below).toBeLessThanOrEqual(tau * n + 1e-9);
    expect(below + equal).toBeGreaterThanOrEqual(tau * n - 1e-9);
  });

  it("returns null for n < 2 or constant x", () => {
    expect(fitLinearQuantileRegression(Float64Array.from([1]), Float64Array.from([2]), 0.5)).toBe(
      null,
    );
    expect(
      fitLinearQuantileRegression(Float64Array.from([3, 3, 3]), Float64Array.from([1, 2, 3]), 0.5),
    ).toBe(null);
  });

  it("y-shift equivariance: intercept shifts, slope unchanged", () => {
    const x = Float64Array.from([0, 1, 2, 3]);
    const y = Float64Array.from([0, 1, 2, 4]);
    const base = fitLinearQuantileRegression(x, y, 0.5)!;
    const shiftedY = Float64Array.from(y, (v) => v + 10);
    const shifted = fitLinearQuantileRegression(x, shiftedY, 0.5)!;
    expect(shifted.slope).toBeCloseTo(base.slope, 8);
    expect(shifted.intercept).toBeCloseTo(base.intercept + 10, 8);
  });

  // n > PAIRWISE_CAP (150) forces the bisection path (not pairwise LP vertices).
  it("large-n collinear recovers y = 1 + 2x on the bisection path", () => {
    const n = 300;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = i;
      y[i] = 1 + 2 * i;
    }
    for (const tau of [0.25, 0.5, 0.75]) {
      const fit = fitLinearQuantileRegression(x, y, tau);
      expect(fit).not.toBeNull();
      expect(fit!.intercept).toBeCloseTo(1, 6);
      expect(fit!.slope).toBeCloseTo(2, 6);
    }
  });

  it("large-n steep collinear recovers y = 1 + 500x (expand from default bracket)", () => {
    const n = 300;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = i;
      y[i] = 1 + 500 * i;
    }
    const fit = fitLinearQuantileRegression(x, y, 0.5);
    expect(fit).not.toBeNull();
    expect(fit!.intercept).toBeCloseTo(1, 4);
    expect(fit!.slope).toBeCloseTo(500, 4);
  });

  it("large-n steep negative collinear recovers y = 1 - 200x", () => {
    const n = 300;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = i;
      y[i] = 1 - 200 * i;
    }
    const fit = fitLinearQuantileRegression(x, y, 0.5);
    expect(fit).not.toBeNull();
    expect(fit!.intercept).toBeCloseTo(1, 4);
    expect(fit!.slope).toBeCloseTo(-200, 4);
  });
});

describe("statQuantile", () => {
  it("emits one series per quantile with n grid points", () => {
    const result = statQuantile({
      x: Float64Array.from([0, 1, 2, 3, 4]),
      y: Float64Array.from([1, 3, 5, 7, 9]),
      groups: [0, 0, 0, 0, 0],
      quantiles: [0.25, 0.5, 0.75],
      n: 5,
      carried: {},
    });
    // 3 quantiles × 5 grid points
    expect(result.x.length).toBe(15);
    expect(new Set(result.groups).size).toBe(3);
    expect(result.droppedGroups).toBe(0);
    // All fits recover the line → y values at grid match 1+2x
    for (let i = 0; i < result.x.length; i++) {
      expect(result.y[i]!).toBeCloseTo(1 + 2 * result.x[i]!, 6);
    }
  });

  it("drops degenerate groups", () => {
    const result = statQuantile({
      x: Float64Array.from([1, 1]),
      y: Float64Array.from([0, 1]),
      groups: [0, 0],
      quantiles: [0.5],
      n: 2,
      carried: {},
    });
    expect(result.x.length).toBe(0);
    expect(result.droppedGroups).toBe(1);
  });
});
