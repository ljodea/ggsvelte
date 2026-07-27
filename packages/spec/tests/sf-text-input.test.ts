/**
 * Knip + surface lock: SfTextLayerInput is a public builder input (#809 phase 2).
 */
import { describe, expect, it } from "bun:test";

import type { SfTextLayerInput } from "../src/normalize-input.js";

describe("SfTextLayerInput", () => {
  it("accepts the geom_sf_text builder shape", () => {
    const layer: SfTextLayerInput = {
      geom: "sf_text",
      aes: { label: "name" },
    };
    expect(layer.geom).toBe("sf_text");
  });
});
