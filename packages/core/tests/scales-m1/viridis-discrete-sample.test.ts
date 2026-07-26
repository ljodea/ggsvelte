/**
 * #828 discrete viridis sampling — evenly spaced colors across the ramp.
 */
import { describe, expect, it } from "bun:test";

import {
  rampColor,
  sampleSequentialPalette,
  trainColor,
  VIRIDIS_RAMP_10,
} from "../../src/index.js";

describe("sampleSequentialPalette / trainColor sequential discrete (#828)", () => {
  it("samples exact midpoints for known k values", () => {
    expect(sampleSequentialPalette(VIRIDIS_RAMP_10, 1)).toEqual([rampColor(VIRIDIS_RAMP_10, 0.5)]);
    expect(sampleSequentialPalette(VIRIDIS_RAMP_10, 2)).toEqual([
      rampColor(VIRIDIS_RAMP_10, 0),
      rampColor(VIRIDIS_RAMP_10, 1),
    ]);
    expect(sampleSequentialPalette(VIRIDIS_RAMP_10, 3)).toEqual([
      rampColor(VIRIDIS_RAMP_10, 0),
      rampColor(VIRIDIS_RAMP_10, 0.5),
      rampColor(VIRIDIS_RAMP_10, 1),
    ]);
    const five = sampleSequentialPalette(VIRIDIS_RAMP_10, 5);
    expect(five).toHaveLength(5);
    expect(five[0]).toBe(rampColor(VIRIDIS_RAMP_10, 0));
    expect(five[4]).toBe(rampColor(VIRIDIS_RAMP_10, 1));
    // Three categories must not be the first three dark purple stops of the table.
    const threeStops = sampleSequentialPalette(VIRIDIS_RAMP_10, 3);
    expect(threeStops).not.toEqual([...VIRIDIS_RAMP_10].slice(0, 3));
  });

  it("trains discrete viridis with evenly spaced colors for k=3", () => {
    const scale = trainColor(["a", "b", "c", "a", "b"], null, { scheme: "viridis" });
    expect(scale.domain).toEqual(["a", "b", "c"]);
    const expected = sampleSequentialPalette(VIRIDIS_RAMP_10, 3);
    expect(scale.colorOf("a")).toBe(expected[0]);
    expect(scale.colorOf("b")).toBe(expected[1]);
    expect(scale.colorOf("c")).toBe(expected[2]);
  });

  it("honors reverse for sequential discrete schemes", () => {
    const scale = trainColor(["a", "b", "c"], null, { scheme: "plasma", reverse: true });
    const forward = trainColor(["a", "b", "c"], null, { scheme: "plasma" });
    expect(scale.colorOf("a")).toBe(forward.colorOf("c"));
    expect(scale.colorOf("c")).toBe(forward.colorOf("a"));
  });
});
