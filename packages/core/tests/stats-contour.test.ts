/**
 * Pure stat_contour marching-squares isolines (#801).
 */
import { describe, expect, it } from "bun:test";

import { cellSegments, contourLevels, stitchSegments, statContour } from "../src/stats/contour.ts";

describe("contourLevels", () => {
  it("uses explicit breaks", () => {
    expect(contourLevels(0, 1, { breaks: [0.25, 0.75] })).toEqual([0.25, 0.75]);
  });

  it("spaces bins inclusively from min to max", () => {
    expect(contourLevels(0, 1, { bins: 3 })).toEqual([0, 0.5, 1]);
  });

  it("uses binwidth steps", () => {
    expect(contourLevels(0, 1, { binwidth: 0.5 })).toEqual([0, 0.5, 1]);
  });
});

describe("cellSegments", () => {
  it("cuts the bottom-left corner", () => {
    // SW high, others low → segment bottom-left
    const segs = cellSegments(0, 1, 0, 1, 1, 0, 0, 0, 0.5);
    expect(segs.length).toBe(1);
    const [[a, b]] = segs;
    expect(a!.y).toBeCloseTo(0, 9);
    expect(a!.x).toBeCloseTo(0.5, 9);
    expect(b!.x).toBeCloseTo(0, 9);
    expect(b!.y).toBeCloseTo(0.5, 9);
  });

  it("returns empty when all corners same side", () => {
    expect(cellSegments(0, 1, 0, 1, 0, 0, 0, 0, 0.5)).toEqual([]);
    expect(cellSegments(0, 1, 0, 1, 1, 1, 1, 1, 0.5)).toEqual([]);
  });
});

describe("stitchSegments", () => {
  it("chains collinear segments", () => {
    const lines = stitchSegments([
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    ]);
    expect(lines.length).toBe(1);
    expect(lines[0]!.length).toBe(3);
  });
});

describe("statContour", () => {
  // 3×3 grid z = x (vertical isolines at constant x where z crosses level)
  function gridXY(n: number): { x: Float64Array; y: Float64Array; z: Float64Array } {
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        x.push(i);
        y.push(j);
        z.push(i); // z = x
      }
    }
    return {
      x: Float64Array.from(x),
      y: Float64Array.from(y),
      z: Float64Array.from(z),
    };
  }

  it("emits isolines for level midway between x columns", () => {
    const g = gridXY(3);
    const result = statContour({
      ...g,
      groups: Array.from({ length: g.x.length }, () => 0),
      params: { breaks: [0.5] },
    });
    expect(result.x.length).toBeGreaterThan(0);
    // All vertices near x=0.5
    for (let i = 0; i < result.x.length; i++) {
      expect(result.x[i]!).toBeCloseTo(0.5, 6);
      expect(result.level[i]!).toBe(0.5);
    }
  });

  it("constant field yields no contours without explicit breaks", () => {
    const n = 4;
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        x.push(i);
        y.push(j);
        z.push(5);
      }
    }
    const result = statContour({
      x: Float64Array.from(x),
      y: Float64Array.from(y),
      z: Float64Array.from(z),
      groups: Array.from({ length: n * n }, () => 0),
      params: { bins: 5 },
    });
    expect(result.x.length).toBe(0);
  });

  it("drops non-finite input rows", () => {
    const g = gridXY(2);
    const x = Float64Array.from([...g.x, Number.NaN]);
    const y = Float64Array.from([...g.y, 0]);
    const z = Float64Array.from([...g.z, 0]);
    const groups = Array.from({ length: x.length }, () => 0);
    const result = statContour({
      x,
      y,
      z,
      groups,
      params: { breaks: [0.5] },
    });
    expect(result.dropped).toBe(1);
  });

  it("groups independently", () => {
    const g0 = gridXY(2);
    const g1 = gridXY(2);
    const x = Float64Array.from([...g0.x, ...g1.x]);
    const y = Float64Array.from([...g0.y, ...g1.y]);
    const z = Float64Array.from([...g0.z, ...g1.z.map((v) => v + 10)]);
    const groups = [
      ...Array.from({ length: g0.x.length }, () => 0),
      ...Array.from({ length: g1.x.length }, () => 1),
    ];
    const result = statContour({
      x,
      y,
      z,
      groups,
      params: { breaks: [0.5, 10.5] },
    });
    expect(new Set(result.groups).size).toBe(2);
  });
});
