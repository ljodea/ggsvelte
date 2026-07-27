/**
 * ecdf stat — unit + ggplot2 layer_data-aligned expectations.
 */
import { describe, expect, it } from "bun:test";

import { statEcdf } from "../../src/stats/ecdf.ts";

describe("statEcdf", () => {
  it("emits one row per unique x when n is omitted (pad false)", () => {
    // R: ggplot(data.frame(x=c(1,2,2,3)), aes(x)) + stat_ecdf(pad=FALSE)
    const x = Float64Array.from([1, 2, 2, 3]);
    const result = statEcdf({
      x,
      groups: [0, 0, 0, 0],
      params: { pad: false },
    });
    expect([...result.x]).toEqual([1, 2, 3]);
    expect([...result.ecdf]).toEqual([0.25, 0.75, 1]);
    expect(result.dropped).toBe(0);
  });

  it("pad prepends (xmin, 0); trailing Inf pad is finite-clamped away", () => {
    const x = Float64Array.from([1, 2, 2, 3]);
    const result = statEcdf({
      x,
      groups: [0, 0, 0, 0],
      params: { pad: true },
    });
    expect([...result.x]).toEqual([1, 1, 2, 3]);
    expect([...result.ecdf]).toEqual([0, 0.25, 0.75, 1]);
  });

  it("n evaluates on an equal grid over the data range", () => {
    // R: stat_ecdf(pad=FALSE, n=5) on c(1,2,2,3)
    const x = Float64Array.from([1, 2, 2, 3]);
    const result = statEcdf({
      x,
      groups: [0, 0, 0, 0],
      params: { pad: false, n: 5 },
    });
    expect(result.x.length).toBe(5);
    expect(result.x[0]).toBeCloseTo(1, 9);
    expect(result.x[4]).toBeCloseTo(3, 9);
    expect([...result.ecdf].map((v) => +v.toFixed(8))).toEqual([0.25, 0.25, 0.75, 0.75, 1]);
  });

  it("computes independent ECDFs per group", () => {
    // group a: 1,2,3 → F 1/3,2/3,1; group b: 10,11 → F 0.5,1
    const x = Float64Array.from([1, 2, 3, 10, 11]);
    const result = statEcdf({
      x,
      groups: [0, 0, 0, 1, 1],
      params: { pad: false },
    });
    const g0 = result.groups
      .map((g, i) => (g === 0 ? result.ecdf[i]! : null))
      .filter((v): v is number => v !== null);
    const g1 = result.groups
      .map((g, i) => (g === 1 ? result.ecdf[i]! : null))
      .filter((v): v is number => v !== null);
    expect(g0.map((v) => +v.toFixed(8))).toEqual([+(1 / 3).toFixed(8), +(2 / 3).toFixed(8), 1]);
    expect(g1).toEqual([0.5, 1]);
  });

  it("drops non-finite x", () => {
    const x = Float64Array.from([1, Number.NaN, 2, Number.POSITIVE_INFINITY, 3]);
    const result = statEcdf({
      x,
      groups: [0, 0, 0, 0, 0],
      params: { pad: false },
    });
    expect(result.dropped).toBe(2);
    expect([...result.x]).toEqual([1, 2, 3]);
    expect([...result.ecdf]).toEqual([1 / 3, 2 / 3, 1]);
  });
});
