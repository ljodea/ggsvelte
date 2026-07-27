/**
 * Knip + surface lock: SfLabelLayerInput is a public builder input (#809 phase 3).
 */
import { describe, expect, it } from "bun:test";

import type { SfLabelLayerInput } from "../src/normalize-input.js";

describe("SfLabelLayerInput", () => {
  it("accepts the geom_sf_label builder shape", () => {
    const layer: SfLabelLayerInput = {
      geom: "sf_label",
      aes: { label: "name" },
      params: { padding: 3, radius: 2 },
    };
    expect(layer.geom).toBe("sf_label");
  });
});
