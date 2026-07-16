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

  it("facet free_y shows y axes on every column (not only the left edge)", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 1, g: "a" },
          { x: 2, y: 10, g: "b" },
          { x: 3, y: 100, g: "c" },
          { x: 4, y: 2, g: "d" },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .facet({ wrap: "g", scales: "free_y", ncol: 2 })
        .spec(),
      size,
    );
    expect(model.scene.panels).toHaveLength(4);
    // free_y: each column gets its own y axis chrome
    const withY = model.scene.panels.filter((p) => p.axisY !== null);
    expect(withY.length).toBeGreaterThanOrEqual(2);
  });

  it("legend reserves right margin when fill is mapped", () => {
    const model = runPipeline(
      gg(
        [
          { g: "a", y: 1 },
          { g: "b", y: 2 },
        ],
        aes({ x: "g", y: "y", fill: "g" }),
      )
        .geomCol()
        .spec(),
      size,
    );
    expect(model.scene.legends.length).toBeGreaterThan(0);
    const panel = model.scene.panels[0]!;
    // legend occupies right of the plot; panel should not span full width
    expect(panel.x + panel.width).toBeLessThan(size.width - 8);
  });

  it("labs and flip swap axis title orientation on the scene", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .labs({ x: "Miles", y: "Gallons", title: "Mileage" })
        .coord({ type: "flip" })
        .spec(),
      size,
    );
    expect(model.scene.title).toBe("Mileage");
    // under flip, semantic x title renders on the vertical axis
    expect(model.scene.axes.y.title).toBe("Miles");
    expect(model.scene.axes.x.title).toBe("Gallons");
  });
});
