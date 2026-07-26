/**
 * stat_function — named registry evaluation (clean-room, no ggplot2 source).
 */
import { describe, expect, it } from "bun:test";
import { statFunction, dnorm, pnorm } from "../../src/stats/function.ts";

describe("function registry math", () => {
  it("dnorm peaks at mean and integrates roughly to 1", () => {
    expect(dnorm(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
    expect(dnorm(0, 0, 1)).toBeGreaterThan(dnorm(1, 0, 1));
    // Trapezoid on a fine grid over ±6σ
    const n = 1001;
    const lo = -6;
    const hi = 6;
    let area = 0;
    for (let i = 0; i < n - 1; i++) {
      const x0 = lo + ((hi - lo) * i) / (n - 1);
      const x1 = lo + ((hi - lo) * (i + 1)) / (n - 1);
      area += 0.5 * (dnorm(x0, 0, 1) + dnorm(x1, 0, 1)) * (x1 - x0);
    }
    expect(area).toBeCloseTo(1, 2);
  });

  it("pnorm is 0.5 at mean and approaches 0/1 at tails", () => {
    expect(pnorm(0, 0, 1)).toBeCloseTo(0.5, 8);
    expect(pnorm(-10, 0, 1)).toBeCloseTo(0, 5);
    expect(pnorm(10, 0, 1)).toBeCloseTo(1, 5);
  });
});

describe("statFunction", () => {
  it("evaluates dnorm on an even grid over xlim", () => {
    const result = statFunction({
      params: { fun: "dnorm", n: 5, xlim: [-2, 2], args: { mean: 0, sd: 1 } },
    });
    expect(result.x.length).toBe(5);
    expect(result.y.length).toBe(5);
    expect(result.x[0]).toBe(-2);
    expect(result.x[4]).toBe(2);
    expect(result.y[2]!).toBeCloseTo(dnorm(0, 0, 1), 10);
    expect(result.groups.every((g) => g === 0)).toBe(true);
  });

  it("identity maps y = x", () => {
    const result = statFunction({
      params: { fun: "identity", n: 3, xlim: [1, 3] },
    });
    expect([...result.y]).toEqual([1, 2, 3]);
  });

  it("linear uses a + b*x", () => {
    const result = statFunction({
      params: { fun: "linear", n: 3, xlim: [0, 2], args: { a: 1, b: 2 } },
    });
    expect([...result.y]).toEqual([1, 3, 5]);
  });

  it("returns empty when domain cannot be resolved", () => {
    const result = statFunction({ params: { fun: "identity", n: 11 } });
    expect(result.x.length).toBe(0);
    expect(result.domainMissing).toBe(true);
  });

  it("uses provided domain when xlim omitted", () => {
    const result = statFunction({
      params: { fun: "identity", n: 3 },
      domain: [10, 12],
    });
    expect([...result.x]).toEqual([10, 11, 12]);
    expect([...result.y]).toEqual([10, 11, 12]);
  });
});
