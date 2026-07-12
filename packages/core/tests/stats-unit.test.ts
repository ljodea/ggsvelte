/**
 * Unit edges for the M2 stats helpers: numeric primitives, degenerate
 * inputs, and na-drop policies not exercised by the R fixtures.
 */
import { describe, expect, it } from "bun:test";

import { statBin } from "../src/stats/bin.ts";
import { statDensity } from "../src/stats/density.ts";
import { loessFit } from "../src/stats/loess.ts";
import { mean, mulberry32, quantile7, resolution, sampleSD } from "../src/stats/numeric.ts";
import { statSummary } from "../src/stats/summary.ts";
import { jitterOffsets, nudgeOffsets } from "../src/positions/jitter.ts";

describe("numeric helpers", () => {
  it("quantile7 matches R's type-7 rule", () => {
    const sorted = [1, 2, 3, 4, 10];
    expect(quantile7(sorted, 0)).toBe(1);
    expect(quantile7(sorted, 1)).toBe(10);
    expect(quantile7(sorted, 0.5)).toBe(3);
    expect(quantile7(sorted, 0.25)).toBe(2); // h = 2
    expect(quantile7(sorted, 0.75)).toBe(4); // h = 4
    expect(quantile7([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75, 12); // R: 1.75
    expect(quantile7([5], 0.5)).toBe(5);
  });

  it("mean / sampleSD", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(sampleSD([1, 2, 3])).toBeCloseTo(1, 12);
    expect(Number.isNaN(sampleSD([1]))).toBe(true);
  });

  it("resolution is the smallest positive gap between distinct values", () => {
    expect(resolution([1, 4, 2, 2, 9])).toBe(1);
    expect(resolution([10, 10, 10])).toBe(0);
    expect(resolution([3])).toBe(0);
    expect(resolution([0, 0.5, NaN, 2])).toBe(0.5);
  });

  it("mulberry32 is deterministic and uniform in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
  });
});

describe("statBin edges", () => {
  it("zero-variance x falls back to width 0.1 (ggplot2's rule)", () => {
    const result = statBin({ x: Float64Array.from([5, 5, 5]), groups: [0, 0, 0] });
    expect(result.count.reduce((a, b) => a + b, 0)).toBe(3);
    for (let i = 0; i < result.x.length; i++) {
      expect(result.xmax[i]! - result.xmin[i]!).toBeCloseTo(0.1, 9);
    }
  });

  it("all-missing x produces an empty result with everything dropped", () => {
    const result = statBin({ x: Float64Array.from([NaN, NaN]), groups: [0, 0] });
    expect(result.x.length).toBe(0);
    expect(result.dropped).toBe(2);
  });

  it("missing weights count as zero, not dropped (ggplot2 semantics)", () => {
    const result = statBin({
      x: Float64Array.from([1, 2, 3]),
      groups: [0, 0, 0],
      weights: Float64Array.from([2, NaN, 2]),
      params: { binwidth: 10, boundary: 0 },
    });
    expect(result.dropped).toBe(0);
    expect(result.count.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe("statDensity edges", () => {
  it("weights are normalized within the group", () => {
    const x = Float64Array.from([0, 1, 2, 3]);
    const unweighted = statDensity({ x, groups: [0, 0, 0, 0], params: { n: 64, bw: 0.5 } });
    const weighted = statDensity({
      x,
      groups: [0, 0, 0, 0],
      weights: Float64Array.from([2, 2, 2, 2]), // uniform -> same as unweighted
      params: { n: 64, bw: 0.5 },
    });
    for (let i = 0; i < unweighted.density.length; i++) {
      expect(weighted.density[i]!).toBeCloseTo(unweighted.density[i]!, 12);
    }
  });

  it("density integrates to ~1 over the grid", () => {
    const rnd = mulberry32(3);
    const x = Float64Array.from({ length: 200 }, () => rnd() * 4);
    const result = statDensity({ x, groups: Array.from({ length: 200 }, () => 0) });
    const step = result.x[1]! - result.x[0]!;
    let integral = 0;
    for (let i = 0; i < result.density.length; i++) integral += result.density[i]! * step;
    expect(integral).toBeGreaterThan(0.98);
    expect(integral).toBeLessThan(1.02);
  });
});

describe("statSummary edges", () => {
  it("a single observation has zero standard error (mean_se)", () => {
    const result = statSummary({ x: ["a"], y: Float64Array.from([7]), groups: [0] });
    expect(result.y[0]).toBe(7);
    expect(result.ymin[0]).toBe(7);
    expect(result.ymax[0]).toBe(7);
  });

  it("non-mean fun without funMin/funMax yields ymin = ymax = y (documented)", () => {
    const result = statSummary({
      x: ["a", "a", "a"],
      y: Float64Array.from([1, 2, 9]),
      groups: [0, 0, 0],
      fun: "median",
    });
    expect(result.y[0]).toBe(2);
    expect(result.ymin[0]).toBe(2);
    expect(result.ymax[0]).toBe(2);
  });
});

describe("loessFit edges", () => {
  it("returns null for degenerate inputs", () => {
    expect(
      loessFit(Float64Array.from([1, 2]), Float64Array.from([1, 2]), {
        span: 0.75,
        degree: 2,
        statistics: false,
      }),
    ).toBeNull();
  });

  it("reproduces a straight line exactly (any span/degree)", () => {
    const x = Float64Array.from({ length: 20 }, (_, i) => i);
    const y = Float64Array.from({ length: 20 }, (_, i) => 3 + 2 * i);
    const model = loessFit(x, y, { span: 0.75, degree: 2, statistics: true })!;
    expect(model.predict(7.35)).toBeCloseTo(3 + 2 * 7.35, 8);
    expect(model.sigma).toBeCloseTo(0, 8);
  });

  it("handles heavy duplicate-x windows by degree reduction", () => {
    const x = Float64Array.from([1, 1, 1, 1, 1, 1, 2, 3]);
    const y = Float64Array.from([1, 1.1, 0.9, 1, 1, 1, 2, 3]);
    const model = loessFit(x, y, { span: 0.9, degree: 2, statistics: false });
    expect(model).not.toBeNull();
    expect(Number.isFinite(model!.predict(1))).toBe(true);
  });
});

describe("jitter / nudge offsets", () => {
  it("jitter offsets are bounded and deterministic per seed", () => {
    const xN = Float64Array.from([0, 1, 2, 3, 4]);
    const a = jitterOffsets({ n: 5, seed: 1, xNumeric: xN, yNumeric: xN });
    const b = jitterOffsets({ n: 5, seed: 1, xNumeric: xN, yNumeric: xN });
    expect(a.dx).toEqual(b.dx);
    expect(a.dy).toEqual(b.dy);
    for (const v of a.dx) expect(Math.abs(v)).toBeLessThanOrEqual(0.4); // 0.4 * resolution 1
  });

  it("explicit width 0 disables an axis; discrete axes default to 0.4 band fractions", () => {
    const off = jitterOffsets({ n: 3, width: 0, xNumeric: null, yNumeric: null });
    expect([...off.dx]).toEqual([0, 0, 0]);
    for (const v of off.dy) expect(Math.abs(v)).toBeLessThanOrEqual(0.4);
  });

  it("nudge fills constant offsets", () => {
    const off = nudgeOffsets(2, 0.5, -1);
    expect([...off.dx]).toEqual([0.5, 0.5]);
    expect([...off.dy]).toEqual([-1, -1]);
  });
});
