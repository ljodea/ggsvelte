import { describe, expect, it } from "bun:test";

import { statDensity } from "../src/stats/density.ts";

/**
 * Large-group binned convolution: for groups well above the grid size the
 * stat bins linearly onto the evaluation grid and convolves with the exact
 * gaussian taps (what R's FFT approximates) instead of summing every pair.
 * These tests pin the CONTRACT of that path: agreement with the direct sum,
 * mass conservation, and weight normalization — not the binning internals.
 */
describe("statDensity — large-group binned path", () => {
  // Deterministic non-uniform data: two clumps plus a tail, n above the
  // 4×grid threshold at the default 512-point grid.
  const n = 4096;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    x[i] = i % 3 === 0 ? t * 10 : i % 3 === 1 ? 40 + t * 20 : 90 + t * 10;
  }
  const groups = Array.from({ length: n }, () => 0);

  it("matches the direct kernel sum within binning tolerance", () => {
    const result = statDensity({ x, groups });
    // Independent direct evaluation of the same estimator on the same grid.
    const bw = estimateBw(x);
    const sorted = Float64Array.from(x).toSorted();
    const from = sorted[0]! - 3 * bw;
    const to = sorted.at(-1)! + 3 * bw;
    const step = (to - from) / (result.x.length - 1);
    for (let k = 0; k < result.x.length; k++) {
      const x0 = from + k * step;
      expect(result.x[k]!).toBeCloseTo(x0, 9);
      let direct = 0;
      for (let i = 0; i < n; i++) {
        const z = (x0 - x[i]!) / bw;
        direct += ((1 / n) * (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI))) / bw;
      }
      // Linear binning redistributes each point to its two nearest grid
      // nodes; relative drift stays well under the R-parity tolerance.
      expect(Math.abs(result.density[k]! - direct)).toBeLessThan(1e-3 * Math.max(1, direct));
      expect(result.count[k]!).toBeCloseTo(result.density[k]! * n, 9);
    }
  });

  it("integrates to ~1 over the grid (mass-conserving binning)", () => {
    const result = statDensity({ x, groups });
    const step = result.x[1]! - result.x[0]!;
    let integral = 0;
    for (let k = 0; k < result.density.length; k++) integral += result.density[k]! * step;
    expect(integral).toBeCloseTo(1, 2);
  });

  it("normalizes weights within the group", () => {
    const weights = new Float64Array(n).fill(2);
    const weighted = statDensity({ x, groups, weights });
    const unweighted = statDensity({ x, groups });
    for (let k = 0; k < weighted.density.length; k++) {
      expect(weighted.density[k]!).toBeCloseTo(unweighted.density[k]!, 12);
    }
  });

  it("keeps the exact direct path when the grid is coarse relative to the bandwidth", () => {
    // n: 48 over this range gives step/bw ≈ 0.7 — linear binning would
    // widen the effective bandwidth by percent levels. The stat must fall
    // back to the exact direct sum, so the result matches an independent
    // direct evaluation to (near) machine precision, not binning tolerance.
    const result = statDensity({ x, groups, params: { n: 48 } });
    const bw = estimateBw(x);
    const sorted = Float64Array.from(x).toSorted();
    const from = sorted[0]! - 3 * bw;
    const step = (sorted.at(-1)! + 3 * bw - from) / (result.x.length - 1);
    for (let k = 0; k < result.x.length; k++) {
      const x0 = from + k * step;
      let direct = 0;
      for (let i = 0; i < n; i++) {
        const z = (x0 - x[i]!) / bw;
        direct += ((1 / n) * (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI))) / bw;
      }
      expect(Math.abs(result.density[k]! - direct)).toBeLessThan(1e-9 * Math.max(1, direct));
    }
  });
});

/** bw.nrd0 via the same exported helper the stat uses. */
function estimateBw(x: Float64Array): number {
  const sorted = Float64Array.from(x).toSorted();
  // Inline of bwNRD0 to keep the expectation independent of call-site
  // details; identical formula.
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  let ss = 0;
  for (const v of sorted) ss += (v - mean) * (v - mean);
  const sd = Math.sqrt(ss / (sorted.length - 1));
  const q = (p: number) => {
    const h = (sorted.length - 1) * p;
    const lo = Math.floor(h);
    return sorted[lo]! + (h - lo) * (sorted[Math.min(lo + 1, sorted.length - 1)]! - sorted[lo]!);
  };
  const lo = Math.min(sd, (q(0.75) - q(0.25)) / 1.34);
  return 0.9 * lo * Math.pow(sorted.length, -0.2);
}
