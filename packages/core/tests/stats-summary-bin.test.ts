/**
 * Pure stat_summary_bin (#817).
 */
import { describe, expect, it } from "bun:test";

import { statSummaryBin } from "../src/stats/summary-bin.ts";

describe("statSummaryBin", () => {
  it("summarizes mean y per histodot-style bin", () => {
    // boundary 0, binwidth 1, right-closed: (0,1], (1,2], (2,3]
    const result = statSummaryBin({
      x: Float64Array.from([0.5, 1.5, 1.6, 2.5]),
      y: Float64Array.from([10, 20, 30, 40]),
      groups: [0, 0, 0, 0],
      params: { binwidth: 1, boundary: 0, fun: "mean" },
    });
    expect(result.dropped).toBe(0);
    expect(result.x.length).toBe(3);
    expect([...result.x]).toEqual([0.5, 1.5, 2.5]);
    expect([...result.y]).toEqual([10, 25, 40]);
    // single-obs mean_se → zero spread
    expect(result.ymin[0]!).toBe(10);
    expect(result.ymax[0]!).toBe(10);
  });

  it("omits empty middle bins", () => {
    const result = statSummaryBin({
      x: Float64Array.from([0.5, 2.5]),
      y: Float64Array.from([1, 3]),
      groups: [0, 0],
      params: { binwidth: 1, boundary: 0 },
    });
    expect(result.x.length).toBe(2);
    expect([...result.x]).toEqual([0.5, 2.5]);
  });

  it("stacks groups separately on shared breaks", () => {
    const result = statSummaryBin({
      x: Float64Array.from([0.5, 0.5, 1.5, 1.5]),
      y: Float64Array.from([10, 20, 30, 40]),
      groups: [0, 1, 0, 1],
      params: { binwidth: 1, boundary: 0, fun: "mean" },
    });
    expect(result.x.length).toBe(4);
    expect([...result.groups]).toEqual([0, 0, 1, 1]);
    // group 0: bin0 mean 10, bin1 mean 30
    expect(result.y[0]!).toBe(10);
    expect(result.y[1]!).toBe(30);
    // group 1: bin0 mean 20, bin1 mean 40
    expect(result.y[2]!).toBe(20);
    expect(result.y[3]!).toBe(40);
  });

  it("drops non-finite x or y", () => {
    const result = statSummaryBin({
      x: Float64Array.from([0.5, NaN, 1.5, 1.5]),
      y: Float64Array.from([1, 2, Infinity, 4]),
      groups: [0, 0, 0, 0],
      params: { binwidth: 1, boundary: 0 },
    });
    expect(result.dropped).toBe(2);
    expect(result.x.length).toBe(2);
    expect(result.y[1]!).toBe(4);
  });

  it("median + funMin/funMax", () => {
    const result = statSummaryBin({
      x: Float64Array.from([1.1, 1.2, 1.3]),
      y: Float64Array.from([1, 5, 9]),
      groups: [0, 0, 0],
      params: { binwidth: 1, boundary: 0, fun: "median", funMin: "min", funMax: "max" },
    });
    expect(result.x.length).toBe(1);
    expect(result.y[0]!).toBe(5);
    expect(result.ymin[0]!).toBe(1);
    expect(result.ymax[0]!).toBe(9);
  });

  it("reports usedDefaultBins when neither bins nor binwidth set", () => {
    const result = statSummaryBin({
      x: Float64Array.from([0, 1, 2, 3]),
      y: Float64Array.from([1, 2, 3, 4]),
      groups: [0, 0, 0, 0],
      params: {},
    });
    expect(result.usedDefaultBins).toBe(true);
    expect(result.x.length).toBeGreaterThan(0);
  });

  it("emits xmin/xmax bin edges", () => {
    const result = statSummaryBin({
      x: Float64Array.from([0.5]),
      y: Float64Array.from([10]),
      groups: [0],
      params: { binwidth: 1, boundary: 0 },
    });
    expect(result.xmin[0]!).toBe(0);
    expect(result.xmax[0]!).toBe(1);
  });
});
