/**
 * ColorBrewer scheme resolution (#825).
 */
import { describe, expect, it } from "bun:test";

import {
  resolveOrdinalPaletteStops,
  resolveSequentialPipelineRange,
} from "../src/scales/engine.js";
import { CB_BLUES, CB_SET2, colorBrewerStops } from "../src/scales/colorbrewer-palettes.js";
import { VIRIDIS_RAMP_10 } from "../src/scales/viridis-ramp.js";

describe("ColorBrewer scheme resolution (#825)", () => {
  it("resolves qualitative palettes for ordinal stops", () => {
    expect(resolveOrdinalPaletteStops({ scheme: "Set2" })).toEqual([...CB_SET2]);
  });

  it("resolves sequential ColorBrewer ramps for continuous/binned", () => {
    expect(resolveSequentialPipelineRange({ scheme: "Blues" }, VIRIDIS_RAMP_10)).toEqual([
      ...CB_BLUES,
    ]);
    expect(colorBrewerStops("RdYlBu")?.length).toBe(11);
  });

  it("keeps viridis and explicit range precedence", () => {
    expect(resolveSequentialPipelineRange({ scheme: "viridis" }, VIRIDIS_RAMP_10)).toBe(
      VIRIDIS_RAMP_10,
    );
    expect(
      resolveSequentialPipelineRange({ scheme: "Blues", range: ["#000", "#fff"] }, VIRIDIS_RAMP_10),
    ).toEqual(["#000", "#fff"]);
  });
});
