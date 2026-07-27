/**
 * Pure stat_density_2d (#802).
 */
import { describe, expect, it } from "bun:test";

import { bandwidthNRD, statDensity2d } from "../src/stats/density-2d.ts";

describe("bandwidthNRD", () => {
  it("returns positive bandwidth for a spread sample", () => {
    const x = Float64Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(bandwidthNRD(x)).toBeGreaterThan(0);
  });
});

describe("statDensity2d", () => {
  function cloud(n: number, cx = 0, cy = 0, s = 1): { x: Float64Array; y: Float64Array } {
    // Deterministic pseudo-normal-ish samples (Box-Muller-lite)
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = ((i * 37 + 11) % 1000) / 1000 + 1e-6;
      const v = ((i * 91 + 17) % 1000) / 1000 + 1e-6;
      const r = Math.sqrt(-2 * Math.log(u));
      const th = 2 * Math.PI * v;
      x.push(cx + s * r * Math.cos(th));
      y.push(cy + s * r * Math.sin(th));
    }
    return { x: Float64Array.from(x), y: Float64Array.from(y) };
  }

  it("emits isoline vertices for a unimodal cloud", () => {
    const { x, y } = cloud(80);
    const result = statDensity2d({
      x,
      y,
      groups: Array.from({ length: x.length }, () => 0),
      params: { n: 25, bins: 4 },
    });
    expect(result.dropped).toBe(0);
    expect(result.x.length).toBeGreaterThan(0);
    expect(result.level.length).toBe(result.x.length);
  });

  it("drops groups with fewer than 2 points", () => {
    const result = statDensity2d({
      x: Float64Array.from([1]),
      y: Float64Array.from([2]),
      groups: [0],
      params: { n: 10, bins: 3 },
    });
    expect(result.droppedGroups).toBe(1);
    expect(result.x.length).toBe(0);
  });

  it("drops non-finite rows", () => {
    const { x, y } = cloud(20);
    const xx = Float64Array.from([...x, Number.NaN]);
    const yy = Float64Array.from([...y, 0]);
    const result = statDensity2d({
      x: xx,
      y: yy,
      groups: Array.from({ length: xx.length }, () => 0),
      params: { n: 20, bins: 3 },
    });
    expect(result.dropped).toBe(1);
  });

  it("keeps groups separate", () => {
    const a = cloud(40, -2, 0, 0.5);
    const b = cloud(40, 2, 0, 0.5);
    const x = Float64Array.from([...a.x, ...b.x]);
    const y = Float64Array.from([...a.y, ...b.y]);
    const groups = [
      ...Array.from({ length: a.x.length }, () => 0),
      ...Array.from({ length: b.x.length }, () => 1),
    ];
    const result = statDensity2d({
      x,
      y,
      groups,
      params: { n: 20, bins: 3 },
    });
    expect(new Set(result.groups).size).toBe(2);
  });

  it("accepts explicit h pair", () => {
    const { x, y } = cloud(30);
    const result = statDensity2d({
      x,
      y,
      groups: Array.from({ length: x.length }, () => 0),
      params: { h: [1, 1], n: 15, bins: 3 },
    });
    expect(result.x.length).toBeGreaterThan(0);
  });
});
