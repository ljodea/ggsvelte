/**
 * coord_sf pipeline — fixed-aspect layout for already-projected maps (#809).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";

function ratioOf(panel: { width: number; height: number }): number {
  return panel.height / panel.width;
}

function geo(g: object): string {
  return JSON.stringify(g);
}

describe("coord_sf pipeline (#809)", () => {
  it("fits a square data rectangle at ratio 1 for equal projected units", () => {
    const model = runPipeline(
      gg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .coordSf()
        .spec(),
      { width: 640, height: 400 },
    );
    const panel = model.scene.panels[0]!;
    expect(ratioOf(panel)).toBeCloseTo(1, 10);
  });

  it("applies ratio as y-unit length / x-unit length", () => {
    const model = runPipeline(
      gg(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .coordSf({ ratio: 2 })
        .spec(),
      { width: 640, height: 640 },
    );
    expect(ratioOf(model.scene.panels[0]!)).toBeCloseTo(2, 10);
  });

  it("works with geom_sf already-projected polygons", () => {
    const poly = geo({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    });
    const model = runPipeline(
      gg({ geometry: [poly] }, aes({}))
        .geomSf()
        .coordSf({ ratio: 1 })
        .spec(),
      { width: 400, height: 300 },
    );
    expect(model.scene.batches[0]?.kind).toBe("paths");
    // Domain x span 4, y span 2 → unit aspect ratio 1 ⇒ panel h/w ≈ (2/4)*1 = 0.5
    // after equal-unit fitting (y-span/x-span * ratio).
    expect(ratioOf(model.scene.panels[0]!)).toBeCloseTo(0.5, 5);
  });
});
