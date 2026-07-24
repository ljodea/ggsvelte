/**
 * Scale engine policies: one owner for pad, missing colors, palette precedence,
 * and transform-backed sequential training (#643).
 */
import { describe, expect, it } from "bun:test";

describe("padDegenerateDomain", () => {
  it("pads a zero-variance domain symmetrically by ±0.5", async () => {
    const { padDegenerateDomain } = await import("../src/scales/engine.ts");
    expect(padDegenerateDomain(5, 5)).toEqual([4.5, 5.5]);
  });

  it("leaves a non-degenerate domain unchanged", async () => {
    const { padDegenerateDomain } = await import("../src/scales/engine.ts");
    expect(padDegenerateDomain(3, 42)).toEqual([3, 42]);
  });
});

describe("resolveMissingColors", () => {
  it("defaults NA and unknown to #999999 when omitted", async () => {
    const { DEFAULT_MISSING_COLOR, resolveMissingColors } = await import("../src/scales/engine.ts");
    expect(DEFAULT_MISSING_COLOR).toBe("#999999");
    expect(resolveMissingColors()).toEqual({
      naValue: "#999999",
      unknownValue: "#999999",
    });
  });

  it("normalizes author overrides and fills the omitted side from the default", async () => {
    const { resolveMissingColors } = await import("../src/scales/engine.ts");
    expect(resolveMissingColors({ naValue: "#abc" })).toEqual({
      naValue: "#aabbcc",
      unknownValue: "#999999",
    });
    expect(resolveMissingColors({ unknownValue: "#Ff0000" })).toEqual({
      naValue: "#999999",
      unknownValue: "#ff0000",
    });
  });
});

describe("trainSequential transform cohesion", () => {
  it("maps log10 through the shared transform registry", async () => {
    const { trainSequential } = await import("../src/scales/color.ts");
    const { scaleTransform } = await import("../src/scales/transform.ts");
    const scale = trainSequential([1, 1000], {
      transform: "log10",
      range: ["#000000", "#ffffff"],
    });
    const log10 = scaleTransform("log10");
    expect(scale.transformedDomain[0]).toBe(log10.forward(1));
    expect(scale.transformedDomain[1]).toBe(log10.forward(1000));
    expect(scale.transformedDomain).toEqual([0, 3]);
    expect(scale.colorOf(1)).toBe("#000000");
    expect(scale.colorOf(1000)).toBe("#ffffff");
    expect(scale.colorOf(0)).toBeUndefined();
  });

  it("refuses a sequential domain outside the registry validity rules", async () => {
    const { trainSequential } = await import("../src/scales/color.ts");
    expect(() => trainSequential([-1, 10], { transform: "sqrt" })).toThrow(/invalid for sqrt/);
    expect(() => trainSequential([0, 10], { transform: "log10" })).toThrow(/invalid for log10/);
  });
});

describe("palette precedence", () => {
  it("resolves ordinal pipeline range without breaking edition-1 scheme fingerprints", async () => {
    const { resolveOrdinalPipelineRange, resolveOrdinalPaletteStops } =
      await import("../src/scales/engine.ts");
    const { CATEGORICAL_PALETTE_10, CATEGORICAL_SCHEMES } =
      await import("../src/scales/categorical-palettes.ts");
    const edition = ["#111111", "#222222"] as const;
    expect(
      resolveOrdinalPipelineRange({ range: ["#ff0000"], scheme: "tableau10" }, edition),
    ).toEqual(["#ff0000"]);
    // Named schemes leave range undefined so trainColor owns scheme fingerprints.
    expect(resolveOrdinalPipelineRange({ scheme: "tableau10" }, edition)).toBeUndefined();
    expect(resolveOrdinalPipelineRange({}, edition)).toBe(edition);
    // Built-in edition palette stays undefined for observable10 fingerprint stability.
    expect(resolveOrdinalPipelineRange({}, CATEGORICAL_PALETTE_10)).toBeUndefined();
    expect(resolveOrdinalPaletteStops({ scheme: "tableau10" })).toBe(CATEGORICAL_SCHEMES.tableau10);
    expect(resolveOrdinalPaletteStops()).toBe(CATEGORICAL_PALETTE_10);
  });

  it("resolves sequential pipeline range as explicit > viridis scheme > non-default edition", async () => {
    const { resolveSequentialPipelineRange } = await import("../src/scales/engine.ts");
    const { VIRIDIS_RAMP_10 } = await import("../src/scales/color.ts");
    const edition = ["#000000", "#ffffff"] as const;
    expect(resolveSequentialPipelineRange({ range: ["#abc"], scheme: "viridis" }, edition)).toEqual(
      ["#abc"],
    );
    expect(resolveSequentialPipelineRange({ scheme: "viridis" }, edition)).toBe(VIRIDIS_RAMP_10);
    expect(resolveSequentialPipelineRange({}, edition)).toBe(edition);
    expect(resolveSequentialPipelineRange({}, VIRIDIS_RAMP_10)).toBeUndefined();
  });
});
