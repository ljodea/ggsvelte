/**
 * ColorBrewer scheme resolution (#825).
 */
import { describe, expect, it } from "bun:test";

import {
  resolveOrdinalPaletteStops,
  resolveSequentialPipelineRange,
} from "../src/scales/engine.js";
import { colorBrewerStops } from "../src/scales/colorbrewer-palettes.js";
import { VIRIDIS_RAMP_10 } from "../src/scales/viridis-ramp.js";

/** Fixture: max-n Set2 table (must match colorbrewer-palettes CB_SET2). */
const SET2 = [
  "#66c2a5",
  "#fc8d62",
  "#8da0cb",
  "#e78ac3",
  "#a6d854",
  "#ffd92f",
  "#e5c494",
  "#b3b3b3",
] as const;

/** Fixture: 9-class Blues table (must match colorbrewer-palettes CB_BLUES). */
const BLUES = [
  "#f7fbff",
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
] as const;

describe("ColorBrewer scheme resolution (#825)", () => {
  it("resolves qualitative palettes for ordinal stops", () => {
    expect(resolveOrdinalPaletteStops({ scheme: "Set2" })).toEqual([...SET2]);
  });

  it("resolves sequential ColorBrewer ramps for continuous/binned", () => {
    expect(resolveSequentialPipelineRange({ scheme: "Blues" }, VIRIDIS_RAMP_10)).toEqual([
      ...BLUES,
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
