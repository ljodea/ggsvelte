/**
 * Pure geom_spoke endpoint math (#810).
 */
import { describe, expect, it } from "bun:test";

import { spokeEndpoint, spokeEndpoints } from "../src/stats/spoke.ts";

describe("spokeEndpoint", () => {
  it("angle 0 draws to the right by radius", () => {
    expect(spokeEndpoint({ x: 1, y: 2, angle: 0, radius: 3 })).toEqual({
      xend: 4,
      yend: 2,
    });
  });

  it("angle π/2 draws upward by radius", () => {
    const tip = spokeEndpoint({ x: 0, y: 0, angle: Math.PI / 2, radius: 2 });
    expect(tip.xend).toBeCloseTo(0, 12);
    expect(tip.yend).toBeCloseTo(2, 12);
  });

  it("propagates non-finite inputs as NaN", () => {
    expect(Number.isNaN(spokeEndpoint({ x: Number.NaN, y: 0, angle: 0, radius: 1 }).xend)).toBe(
      true,
    );
  });
});

describe("spokeEndpoints", () => {
  it("vectorizes row-wise", () => {
    const { xend, yend } = spokeEndpoints(
      Float64Array.of(0, 1),
      Float64Array.of(0, 1),
      Float64Array.of(0, Math.PI),
      Float64Array.of(1, 2),
    );
    expect(xend[0]).toBeCloseTo(1, 12);
    expect(yend[0]).toBeCloseTo(0, 12);
    expect(xend[1]).toBeCloseTo(1 - 2, 12);
    expect(yend[1]).toBeCloseTo(1, 12);
  });
});
