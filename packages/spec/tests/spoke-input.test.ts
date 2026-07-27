/**
 * Knip + surface lock: SpokeLayerInput is a public builder input (#810).
 * Structural validation: aes constants for angle/radius rejected early.
 */
import { describe, expect, it } from "bun:test";

import type { SpokeLayerInput } from "../src/normalize-input.js";
import { validate } from "../src/validate.js";

describe("SpokeLayerInput", () => {
  it("accepts the geom_spoke builder shape", () => {
    const layer: SpokeLayerInput = {
      geom: "spoke",
      params: { angle: 0, radius: 1 },
    };
    expect(layer.geom).toBe("spoke");
  });
});

describe("spoke structural validation (#810)", () => {
  it("rejects aes.angle constant without params.angle (pipeline is field-only)", () => {
    // Tier-2 structural grammar (opt-in via options) — same path as segment/curve.
    const result = validate(
      {
        layers: [
          {
            geom: "spoke",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              angle: { value: 0 },
              radius: { field: "r" },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.path.includes("angle"))).toBe(true);
  });

  it("accepts params.angle / params.radius constants with field x/y", () => {
    const result = validate(
      {
        data: { columns: { x: [0], y: [0] } },
        layers: [
          {
            geom: "spoke",
            aes: { x: { field: "x" }, y: { field: "y" } },
            params: { angle: 0, radius: 1 },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
