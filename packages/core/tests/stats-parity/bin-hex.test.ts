/**
 * Pure hex binning tests (#800).
 */
import { describe, expect, it } from "bun:test";

import {
  axialToPixel,
  cubeRound,
  hexVertices,
  pixelToAxial,
  statBinHex,
} from "../../src/stats/bin-hex.ts";

describe("hex lattice helpers (#800)", () => {
  it("cubeRound is stable on integers", () => {
    expect(cubeRound(2, -1)).toEqual({ q: 2, r: -1 });
  });

  it("pixelToAxial ∘ axialToPixel recovers axial coords", () => {
    const s = 0.1;
    for (const [q, r] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 2],
      [3, -2],
    ] as const) {
      const p = axialToPixel(q, r, s);
      const back = pixelToAxial(p.x, p.y, s);
      expect(back.q === q || Object.is(back.q, q)).toBe(true);
      expect(back.r === r || Object.is(back.r, r)).toBe(true);
      expect(back.q + 0).toBe(q + 0);
      expect(back.r + 0).toBe(r + 0);
    }
  });

  it("hexVertices produces 6 distinct corners", () => {
    const v = hexVertices(0, 0, 2, 2);
    expect(v).toHaveLength(6);
    const keys = new Set(v.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`));
    expect(keys.size).toBe(6);
  });
});

describe("statBinHex (#800)", () => {
  it("sums all weights into counts", () => {
    const result = statBinHex({
      x: Float64Array.from([0.1, 0.2, 0.9, 0.8]),
      y: Float64Array.from([0.1, 0.15, 0.9, 0.85]),
      groups: [0, 0, 0, 0],
      weights: Float64Array.from([1, 1, 2, 3]),
      params: { bins: 4, drop: true },
    });
    const total = [...result.count].reduce((a, b) => a + b, 0);
    expect(total).toBe(7);
    expect(result.dropped).toBe(0);
  });

  it("drop=true omits empty cells", () => {
    const result = statBinHex({
      x: Float64Array.from([0.5]),
      y: Float64Array.from([0.5]),
      groups: [0],
      params: { bins: 10, drop: true },
    });
    expect(result.count.length).toBe(1);
    expect(result.count[0]).toBe(1);
  });

  it("drop=false emits zero-count cells across the lattice", () => {
    const sparse = statBinHex({
      x: Float64Array.from([0.1, 0.9]),
      y: Float64Array.from([0.1, 0.9]),
      groups: [0, 0],
      params: { bins: 6, drop: true },
    });
    const full = statBinHex({
      x: Float64Array.from([0.1, 0.9]),
      y: Float64Array.from([0.1, 0.9]),
      groups: [0, 0],
      params: { bins: 6, drop: false },
    });
    expect(full.count.length).toBeGreaterThan(sparse.count.length);
    expect([...full.count].some((c) => c === 0)).toBe(true);
    // Occupied mass is unchanged — zeros pad the lattice only.
    const sum = (arr: Float64Array) => [...arr].reduce((a, b) => a + b, 0);
    expect(sum(full.count)).toBe(sum(sparse.count));
  });

  it("drops non-finite coordinates", () => {
    const result = statBinHex({
      x: Float64Array.from([1, NaN, 2]),
      y: Float64Array.from([1, 1, Infinity]),
      groups: [0, 0, 0],
      params: { bins: 5 },
    });
    expect(result.dropped).toBe(2);
    expect(result.count.length).toBe(1);
  });

  it("emits positive width/height for each hex", () => {
    const result = statBinHex({
      x: Float64Array.from([0, 1, 0, 1]),
      y: Float64Array.from([0, 0, 1, 1]),
      groups: [0, 0, 0, 0],
      params: { bins: 4 },
    });
    expect(result.width.length).toBeGreaterThan(0);
    for (let i = 0; i < result.width.length; i++) {
      expect(result.width[i]!).toBeGreaterThan(0);
      expect(result.height[i]!).toBeGreaterThan(0);
    }
  });

  it("groups accumulate separately", () => {
    const result = statBinHex({
      x: Float64Array.from([0.5, 0.5]),
      y: Float64Array.from([0.5, 0.5]),
      groups: [0, 1],
      params: { bins: 4 },
    });
    // Same hex cell in two groups → two output rows
    expect(result.count.length).toBe(2);
    expect(new Set(result.groups).size).toBe(2);
  });
});
