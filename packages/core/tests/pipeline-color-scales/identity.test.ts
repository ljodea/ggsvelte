import { describe, expect, it } from "bun:test";

import { runPipeline } from "../../src/pipeline.js";

import { pointColors, pointSpec, size } from "./fixtures.ts";

describe("identity color scales", () => {
  it("forwards valid identity colors and applies explicit invalid/NA policies", () => {
    const model = runPipeline(
      pointSpec(["#f00", "#00ff00", "red", null], {
        type: "identity",
        naValue: "#aaa",
        unknownValue: "#333",
      }),
      size,
    );
    expect(model.scales.color?.kind).toBe("identity");
    expect(pointColors(model)).toEqual(["#ff0000", "#00ff00", "#333333", "#aaaaaa"]);
    expect(model.scene.legends).toHaveLength(0);
    expect(model.guidePlans.some((candidate) => candidate.aesthetic === "color")).toBe(false);
  });
});
