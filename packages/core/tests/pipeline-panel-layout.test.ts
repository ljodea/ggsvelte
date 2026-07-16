/**
 * Characterization tests for panel layout placement contracts.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import { STRIP_BAND } from "../src/scene.ts";

const size = { width: 640, height: 400 };

describe("panel layout via runPipeline", () => {
  it("single panel fills the plot interior with both axes", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    expect(model.scene.panels).toHaveLength(1);
    const p = model.scene.panels[0]!;
    expect(p.width).toBeGreaterThan(200);
    expect(p.height).toBeGreaterThan(150);
    expect(p.axisX).not.toBeNull();
    expect(p.axisY).not.toBeNull();
  });

  it("facet wrap places panels on a grid with strips", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1, g: "a" },
          { x: 2, y: 2, g: "b" },
          { x: 3, y: 3, g: "c" },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .facet({ wrap: "g" })
        .spec(),
      size,
    );
    expect(model.scene.panels).toHaveLength(3);
    expect(model.scene.panels.map((p) => p.strip).toSorted()).toEqual(["a", "b", "c"]);
    // strips reserve a band above panels
    expect(model.scene.panels[0]!.y).toBeGreaterThanOrEqual(STRIP_BAND);
  });
});
