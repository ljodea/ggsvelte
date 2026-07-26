/**
 * Pure geom_curve tessellation (#794).
 */
import { describe, expect, it } from "bun:test";

import { curveSampleCount, tessellateCurve } from "../src/stats/curve.ts";

describe("tessellateCurve", () => {
  it("curvature 0 keeps samples collinear on the chord", () => {
    const { positions, count } = tessellateCurve({
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 0,
      curvature: 0,
      angle: 90,
      ncp: 2,
    });
    expect(count).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < count; i++) {
      expect(positions[i * 2 + 1]!).toBeCloseTo(0, 10);
      expect(positions[i * 2]!).toBeGreaterThanOrEqual(-1e-9);
      expect(positions[i * 2]!).toBeLessThanOrEqual(10 + 1e-9);
    }
    expect(positions[0]).toBeCloseTo(0, 12);
    expect(positions[(count - 1) * 2]!).toBeCloseTo(10, 12);
  });

  it("positive curvature with angle 90 offsets the midpoint off the chord", () => {
    const { positions, count } = tessellateCurve({
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 0,
      curvature: 0.5,
      angle: 90,
      ncp: 2,
    });
    const mid = Math.floor(count / 2);
    // Chord is y=0; bent midpoint should leave the x-axis.
    expect(Math.abs(positions[mid * 2 + 1]!)).toBeGreaterThan(0.5);
  });

  it("ncp increases sample density", () => {
    expect(curveSampleCount(5)).toBe(40);
    expect(curveSampleCount(10)).toBe(80);
    expect(curveSampleCount(1)).toBe(8);
  });
});
