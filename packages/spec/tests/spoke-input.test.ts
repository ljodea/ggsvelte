/**
 * Knip + surface lock: SpokeLayerInput is a public builder input (#810).
 */
import { describe, expect, it } from "bun:test";

import type { SpokeLayerInput } from "../src/normalize-input.js";

describe("SpokeLayerInput", () => {
  it("accepts the geom_spoke builder shape", () => {
    const layer: SpokeLayerInput = {
      geom: "spoke",
      params: { angle: 0, radius: 1 },
    };
    expect(layer.geom).toBe("spoke");
  });
});
