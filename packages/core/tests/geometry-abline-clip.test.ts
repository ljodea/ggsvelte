import { describe, expect, it } from "bun:test";

import { clipAblineToRect } from "../src/pipeline/geometry-abline-clip.ts";

describe("clipAblineToRect (#790)", () => {
  it("clips identity line y=x to the unit square", () => {
    const clipped = clipAblineToRect(1, 0, 0, 1, 0, 1);
    expect(clipped).not.toBeNull();
    const [x0, y0, x1, y1] = clipped!;
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(0);
    expect(x1).toBeCloseTo(1);
    expect(y1).toBeCloseTo(1);
  });

  it("clips horizontal line y=0.5 across x domain", () => {
    const clipped = clipAblineToRect(0, 0.5, 0, 10, 0, 1);
    expect(clipped).not.toBeNull();
    const [x0, y0, x1, y1] = clipped!;
    expect(y0).toBeCloseTo(0.5);
    expect(y1).toBeCloseTo(0.5);
    expect(Math.min(x0, x1)).toBeCloseTo(0);
    expect(Math.max(x0, x1)).toBeCloseTo(10);
  });

  it("returns null when the line misses the panel", () => {
    expect(clipAblineToRect(0, 5, 0, 1, 0, 1)).toBeNull();
  });

  it("clips a steep line to the y edges", () => {
    const clipped = clipAblineToRect(10, 0, 0, 1, 0, 1);
    expect(clipped).not.toBeNull();
    const [, y0, , y1] = clipped!;
    expect(Math.min(y0, y1)).toBeCloseTo(0);
    expect(Math.max(y0, y1)).toBeCloseTo(1);
  });
});
