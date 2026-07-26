/**
 * #833 multi-aesthetic identity/manual helpers + scaleType registry.
 */
import { describe, expect, it } from "bun:test";

import {
  scaleContinuousIdentity,
  scaleDiscreteIdentity,
  scaleDiscreteManual,
  scaleType,
  scale_continuous_identity,
  scale_discrete_manual,
  scale_type,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("multi-aes scale helpers (#833)", () => {
  it("exports binding-identical snake aliases", () => {
    expect(scale_continuous_identity).toBe(scaleContinuousIdentity);
    expect(scale_discrete_manual).toBe(scaleDiscreteManual);
    expect(scale_type).toBe(scaleType);
  });

  it("expands continuous identity across aesthetics (colour → color)", () => {
    expect(scaleContinuousIdentity({ aesthetics: ["colour", "fill", "size", "alpha"] })).toEqual({
      color: { type: "identity" },
      fill: { type: "identity" },
      size: { type: "identity" },
      alpha: { type: "identity" },
    });
  });

  it("rejects shape on continuous identity and empty aesthetics", () => {
    expect(() => scaleContinuousIdentity({ aesthetics: ["shape"] })).toThrow(/not valid/);
    expect(() => scaleContinuousIdentity({ aesthetics: [] })).toThrow(/non-empty/);
  });

  it("applies discrete identity including shape/linetype", () => {
    expect(scaleDiscreteIdentity({ aesthetics: ["shape", "linetype", "color"] })).toEqual({
      shape: { type: "identity" },
      linetype: { type: "identity" },
      color: { type: "identity" },
    });
  });

  it("applies the same manual values to colour and fill", () => {
    expect(
      scaleDiscreteManual({
        aesthetics: ["colour", "fill"],
        values: ["#ff0000", "#00ff00"],
        domain: ["a", "b"],
      }),
    ).toEqual({
      color: {
        type: "manual",
        range: ["#ff0000", "#00ff00"],
        domain: ["a", "b"],
      },
      fill: {
        type: "manual",
        range: ["#ff0000", "#00ff00"],
        domain: ["a", "b"],
      },
    });
  });

  it("does not share range/domain array identity across channels", () => {
    const scales = scaleDiscreteManual({
      aesthetics: ["size", "alpha"],
      values: [1, 2, 3],
      domain: ["a", "b", "c"],
    });
    const size = scales.size as { range: number[]; domain: string[] };
    const alpha = scales.alpha as { range: number[]; domain: string[] };
    expect(size.range).toEqual(alpha.range);
    expect(size.domain).toEqual(alpha.domain);
    expect(size.range).not.toBe(alpha.range);
    expect(size.domain).not.toBe(alpha.domain);
    size.range[0] = 99;
    expect(alpha.range[0]).toBe(1);
  });

  it("dedupes colour + color to a single channel", () => {
    expect(scaleContinuousIdentity({ aesthetics: ["color", "colour"] })).toEqual({
      color: { type: "identity" },
    });
  });

  it("validates expanded multi-aes identity on a full plot", () => {
    const result = validate({
      data: {
        values: [
          { x: 1, y: 2, c: "#112233", s: 3 },
          { x: 2, y: 3, c: "#445566", s: 4 },
        ],
      },
      aes: {
        x: { field: "x" },
        y: { field: "y" },
        color: { field: "c" },
        size: { field: "s" },
      },
      layers: [point],
      scales: scaleContinuousIdentity({ aesthetics: ["color", "size"] }),
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });
});

describe("scaleType registry (#833)", () => {
  it("recommends position families from data kind", () => {
    expect(scaleType({ aesthetic: "x", dataKind: "quantitative" })).toBe("linear");
    expect(scaleType({ aesthetic: "y", dataKind: "nominal" })).toBe("band");
    expect(scaleType({ aesthetic: "x", dataKind: "temporal" })).toBe("linear");
  });

  it("recommends sequential vs ordinal for color and style channels", () => {
    expect(scaleType({ aesthetic: "colour", dataKind: "quantitative" })).toBe("sequential");
    expect(scaleType({ aesthetic: "fill", dataKind: "nominal" })).toBe("ordinal");
    expect(scaleType({ aesthetic: "shape", dataKind: "quantitative" })).toBe("ordinal");
    expect(scaleType({ aesthetic: "size", dataKind: "quantitative" })).toBe("sequential");
  });
});
