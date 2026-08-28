/**
 * Crameri diverging, multi-sequential, and cyclic (*O) ramp coverage —
 * fixtures pin 11-stop samples from Scientific Colour Maps v8.0.1
 * (Zenodo DOI 10.5281/zenodo.1243862). Ramp data lives in sibling
 * crameri-ramps-*-data.ts modules, split by family.
 */
import { describe, expect, it } from "bun:test";

import { continuousSchemeRamp, resolveSequentialPipelineRange } from "../src/scales/engine.js";
import { crameriRampStops } from "../src/scales/crameri-ramps.js";
import { VIRIDIS_RAMP_10 } from "../src/scales/viridis-ramp.js";
import { DIVERGING_RAMPS } from "./crameri-ramps-diverging-data.js";
import { MULTISEQUENTIAL_RAMPS } from "./crameri-ramps-multisequential-data.js";

describe("Crameri Scientific colour maps", () => {
  for (const [name, stops] of Object.entries({ ...DIVERGING_RAMPS, ...MULTISEQUENTIAL_RAMPS })) {
    it(`resolves ${name} for continuous/binned scales`, () => {
      expect(crameriRampStops(name)).toEqual([...stops]);
      expect(continuousSchemeRamp(name)).toEqual([...stops]);
      expect(resolveSequentialPipelineRange({ scheme: name }, VIRIDIS_RAMP_10)).toEqual([...stops]);
    });
  }

  it("resolves cyclic *O ramps as 11-stop sequential tables", () => {
    const romaO = [
      "#733957",
      "#863f38",
      "#9c5d2b",
      "#b88e3b",
      "#d3c876",
      "#cbe1b3",
      "#9bd4cd",
      "#65adca",
      "#4e7cb2",
      "#5e4f85",
      "#723959",
    ];
    expect(crameriRampStops("romaO")).toEqual(romaO);
    expect(resolveSequentialPipelineRange({ scheme: "romaO" }, VIRIDIS_RAMP_10)).toEqual(romaO);
    expect(continuousSchemeRamp("romaO")).toBeUndefined();
  });
});
