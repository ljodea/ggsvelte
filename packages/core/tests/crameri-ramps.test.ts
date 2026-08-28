/**
 * Crameri continuous ramp resolution — fixtures pin 11-stop samples
 * from Scientific Colour Maps v8.0.1 (Zenodo DOI 10.5281/zenodo.1243862).
 * Ramp data lives in sibling crameri-ramps-*-data.ts modules, split by family.
 */
import { describe, expect, it } from "bun:test";

import {
  continuousSchemeRamp,
  resolveOrdinalPaletteStops,
  resolveSequentialPipelineRange,
} from "../src/scales/engine.js";
import { crameriRampStops } from "../src/scales/crameri-ramps.js";
import { sampleSequentialPalette, trainColor } from "../src/scales/train-color.js";
import { VIRIDIS_RAMP_10 } from "../src/scales/viridis-ramp.js";
import { CONTINUOUS_RAMPS } from "./crameri-ramps-continuous-data.js";
import { DIVERGING_RAMPS } from "./crameri-ramps-diverging-data.js";
import { MULTISEQUENTIAL_RAMPS } from "./crameri-ramps-multisequential-data.js";

const ALL_RAMPS: Readonly<Record<string, readonly string[]>> = {
  ...CONTINUOUS_RAMPS,
  ...DIVERGING_RAMPS,
  ...MULTISEQUENTIAL_RAMPS,
};

describe("Crameri Scientific colour maps", () => {
  it("registers the full continuous suite (35 maps)", () => {
    expect(Object.keys(ALL_RAMPS).length).toBe(35);
  });

  for (const [name, stops] of Object.entries(CONTINUOUS_RAMPS)) {
    it(`resolves ${name} for continuous/binned scales`, () => {
      expect(crameriRampStops(name)).toEqual([...stops]);
      expect(continuousSchemeRamp(name)).toEqual([...stops]);
      expect(resolveSequentialPipelineRange({ scheme: name }, VIRIDIS_RAMP_10)).toEqual([...stops]);
    });
  }

  it("resolves a Crameri ramp for ordinal fingerprint fallthrough", () => {
    expect(resolveOrdinalPaletteStops({ scheme: "batlow" })).toEqual([...CONTINUOUS_RAMPS.batlow!]);
    expect(resolveOrdinalPaletteStops({ scheme: "vik" })).toEqual([...DIVERGING_RAMPS.vik!]);
  });

  it("even-samples Crameri ramps for discrete ordinal training (viridis_d parity)", () => {
    const scale = trainColor(["a", "b", "c", "d"], null, { scheme: "batlow" });
    const expected = sampleSequentialPalette(CONTINUOUS_RAMPS.batlow!, 4);
    expect(scale.colorOf("a")).toBe(expected[0]);
    expect(scale.colorOf("d")).toBe(expected[3]);
  });

  it("keeps explicit range and viridis precedence", () => {
    expect(
      resolveSequentialPipelineRange(
        { scheme: "batlow", range: ["#000", "#fff"] },
        VIRIDIS_RAMP_10,
      ),
    ).toEqual(["#000", "#fff"]);
    expect(resolveSequentialPipelineRange({ scheme: "viridis" }, VIRIDIS_RAMP_10)).toBe(
      VIRIDIS_RAMP_10,
    );
    expect(crameriRampStops("batlowS")).toBeUndefined();
  });
});
