/**
 * Polar/radial coordinate projector math (ggplot2 coord_radial transform).
 */
import { describe, expect, it } from "bun:test";

import {
  buildPolarProjector,
  polarBBox,
  polarProject,
  polarUnproject,
  type PolarProjector,
} from "../src/coord-polar.ts";

function fullCircle(
  overrides: Partial<Parameters<typeof buildPolarProjector>[0]> = {},
): PolarProjector {
  return buildPolarProjector({
    theta: "x",
    start: 0,
    end: 2 * Math.PI,
    innerRadius: 0,
    reverse: "none",
    ...overrides,
  });
}

describe("polar projector algebra (ggplot2 coord_radial)", () => {
  it("places theta=0 at 12 o'clock and advances clockwise by default", () => {
    const p = fullCircle();
    // r at outer edge (fraction 1), theta at 0 → top center
    const [x0, y0] = polarProject(p, 0, 1, 100, 100);
    expect(x0).toBeCloseTo(50, 5);
    expect(y0).toBeCloseTo(50 - 40, 5); // outer radius is 0.4 of the unit square

    // theta = π/2 (quarter turn clockwise) → right center
    const [x1, y1] = polarProject(p, 0.25, 1, 100, 100);
    expect(x1).toBeCloseTo(50 + 40, 5);
    expect(y1).toBeCloseTo(50, 5);

    // theta = π → bottom center
    const [x2, y2] = polarProject(p, 0.5, 1, 100, 100);
    expect(x2).toBeCloseTo(50, 5);
    expect(y2).toBeCloseTo(50 + 40, 5);
  });

  it("maps theta aesthetic from y when theta === 'y'", () => {
    const p = fullCircle({ theta: "y" });
    // Input is (xFrac, yFrac) = (r, theta). Outer r, theta=0 → top.
    const [x0, y0] = polarProject(p, 1, 0, 100, 100);
    expect(x0).toBeCloseTo(50, 5);
    expect(y0).toBeCloseTo(10, 5);
  });

  it("honors start offset and reverse theta", () => {
    const p = fullCircle({ start: Math.PI / 2 });
    // start shifts the zero so fraction 0 is at 3 o'clock
    const [x0, y0] = polarProject(p, 0, 1, 100, 100);
    expect(x0).toBeCloseTo(90, 5);
    expect(y0).toBeCloseTo(50, 5);

    const rev = fullCircle({ reverse: "theta" });
    // reverse theta swaps arc ends → fraction 0 lands at full circle end (= start of reverse)
    // arc becomes [2π, 0] → fraction 0 at 2π (= 0) still top? rev(arc) of [0,2π] is [2π,0]
    // theta = 2π + f*(0-2π) = 2π(1-f); f=0 → 2π ≡ 0 → top
    const [rx, ry] = polarProject(rev, 0, 1, 100, 100);
    expect(rx).toBeCloseTo(50, 5);
    expect(ry).toBeCloseTo(10, 5);
    // f=0.25 with reverse → theta = 2π*0.75 = 3π/2 → left (counterclockwise from top)
    const [rx2, ry2] = polarProject(rev, 0.25, 1, 100, 100);
    expect(rx2).toBeCloseTo(10, 5);
    expect(ry2).toBeCloseTo(50, 5);
  });

  it("honors innerRadius as a donut hole", () => {
    const p = fullCircle({ innerRadius: 0.5 });
    // ggplot: inner_radius = c(0.5, 1) * 0.4 = [0.2, 0.4]
    // rFrac=0 → inner hole edge
    const [x0, y0] = polarProject(p, 0, 0, 100, 100);
    expect(x0).toBeCloseTo(50, 5);
    expect(y0).toBeCloseTo(50 - 20, 5);
    const [x1, y1] = polarProject(p, 0, 1, 100, 100);
    expect(x1).toBeCloseTo(50, 5);
    expect(y1).toBeCloseTo(50 - 40, 5);
  });

  it("inverts polar projection within the full circle", () => {
    const p = fullCircle();
    const [px, py] = polarProject(p, 0.3, 0.8, 200, 150);
    const [tf, rf] = polarUnproject(p, px, py, 200, 150);
    expect(tf).toBeCloseTo(0.3, 4);
    expect(rf).toBeCloseTo(0.8, 4);
  });

  it("inverts polar projection with a non-zero start offset", () => {
    const p = fullCircle({ start: Math.PI / 3 });
    const [px, py] = polarProject(p, 0.4, 0.7, 200, 200);
    const [tf, rf] = polarUnproject(p, px, py, 200, 200);
    expect(tf).toBeCloseTo(0.4, 3);
    expect(rf).toBeCloseTo(0.7, 3);
  });

  it("computes full-circle and partial bounding boxes", () => {
    expect(polarBBox([0, 2 * Math.PI], [0, 0.4])).toEqual({ x: [0, 1], y: [0, 1] });
    const half = polarBBox([0, Math.PI], [0, 0.4]);
    // Upper semicircle: y high end still 1, bottom pulled in
    expect(half.x[0]).toBeLessThan(0.5);
    expect(half.x[1]).toBeGreaterThan(0.5);
    expect(half.y[1]).toBe(1);
  });
});
