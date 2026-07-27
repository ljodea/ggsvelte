/**
 * Step-corner geometry — shared by SVG pathData, canvas, and coord projection.
 */
import { describe, expect, it } from "bun:test";

import { isStepCurve, stepCorners, stepCornersPerSegment } from "../src/path-step.ts";

describe("path-step corners", () => {
  it("recognizes step curve ids", () => {
    expect(isStepCurve("step")).toBe(true);
    expect(isStepCurve("step-hv")).toBe(true);
    expect(isStepCurve("step-vh")).toBe(true);
    expect(isStepCurve("linear")).toBe(false);
  });

  it("mid inserts two corners at midpoint x", () => {
    expect(stepCorners(0, 0, 10, 10, "step")).toEqual([
      { x: 5, y: 0 },
      { x: 5, y: 10 },
    ]);
    expect(stepCornersPerSegment("step")).toBe(2);
  });

  it("hv is horizontal then vertical (ggplot2 direction hv)", () => {
    expect(stepCorners(0, 0, 10, 10, "step-hv")).toEqual([{ x: 10, y: 0 }]);
    expect(stepCornersPerSegment("step-hv")).toBe(1);
  });

  it("vh is vertical then horizontal (ggplot2 direction vh)", () => {
    expect(stepCorners(0, 0, 10, 10, "step-vh")).toEqual([{ x: 0, y: 10 }]);
    expect(stepCornersPerSegment("step-vh")).toBe(1);
  });
});
