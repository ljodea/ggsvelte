/**
 * Knip + surface lock: BlankLayerInput is a public builder input (#791).
 */
import { describe, expect, it } from "bun:test";

import type { BlankLayerInput } from "../src/normalize-input.js";

describe("BlankLayerInput", () => {
  it("accepts the geom_blank builder shape", () => {
    const layer: BlankLayerInput = { geom: "blank" };
    expect(layer.geom).toBe("blank");
  });
});
