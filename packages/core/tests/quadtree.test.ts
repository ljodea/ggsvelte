import { describe, expect, it } from "bun:test";

import { StaticQuadtree } from "../src/dom/quadtree.ts";

describe("StaticQuadtree", () => {
  it("nearestWithin finds the closest point inside the radius, exactly", () => {
    const n = 2000;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = (i % 50) * 12.5;
      ys[i] = Math.floor(i / 50) * 9.75;
    }
    const tree = new StaticQuadtree(xs, ys);
    for (let probe = 0; probe < 25; probe++) {
      const px = probe * 23.7;
      const py = probe * 14.1;
      const radius = 8;
      let best = -1;
      let bestD2 = radius * radius;
      for (let i = 0; i < n; i++) {
        const d2 = (xs[i]! - px) ** 2 + (ys[i]! - py) ** 2;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      expect(tree.nearestWithin(px, py, radius)).toBe(best);
    }
  });

  it("queryRect returns exactly the points in the rect", () => {
    const xs = Float64Array.from([0, 10, 20, 30, 40]);
    const ys = Float64Array.from([0, 10, 20, 30, 40]);
    const tree = new StaticQuadtree(xs, ys);
    expect(tree.queryRect(5, 5, 35, 35).toSorted((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(tree.queryRect(100, 100, 200, 200)).toEqual([]);
  });

  it("handles duplicate coordinates without infinite splitting", () => {
    const xs = new Float64Array(100).fill(5);
    const ys = new Float64Array(100).fill(5);
    const tree = new StaticQuadtree(xs, ys);
    expect(tree.queryRect(0, 0, 10, 10)).toHaveLength(100);
  });
});
