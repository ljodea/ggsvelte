import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import Batch from "../../src/lib/scene/Batch.svelte";
import { render } from "../helpers/render.js";

const theme = fromAny({ ink: "#111111", accent: "#336699", interactionMuted: 0.36 });

describe("Batch mapped style vectors", () => {
  it("renders per-point size, alpha, and finite shape", () => {
    const { container } = render(Batch, {
      batch: fromAny({
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: Float32Array.from([10, 10, 20, 20]),
        rowIndex: Uint32Array.from([0, 1]),
        size: 2,
        sizes: Float32Array.from([2, 8]),
        alpha: 1,
        alphas: Float32Array.from([0.25, 0.75]),
        shape: "circle",
        shapeIndexes: Uint8Array.from([0, 3]),
        fill: "red",
      }),
      theme,
    });
    const circle = container.querySelector("circle.gg-shape-circle");
    const diamond = container.querySelector("path.gg-shape-diamond");
    expect(circle?.getAttribute("r")).toBe("2");
    expect(circle?.getAttribute("opacity")).toBe("0.25");
    expect(diamond?.getAttribute("d")).toContain("20 10");
    expect(diamond?.getAttribute("opacity")).toBe("0.75");
  });

  it("renders per-subpath linewidth, alpha, and dash pattern", () => {
    const { container } = render(Batch, {
      batch: fromAny({
        kind: "paths",
        layerIndex: 0,
        panelIndex: 0,
        positions: Float32Array.from([0, 0, 10, 10, 0, 10, 10, 20]),
        rowIndex: Uint32Array.from([0, 1, 2, 3]),
        pathOffsets: Uint32Array.from([0, 2, 4]),
        strokes: ["red", "blue"],
        linewidth: 1,
        linewidths: Float32Array.from([1, 5]),
        alpha: 1,
        alphas: Float32Array.from([0.3, 0.9]),
        linetypeIndexes: Uint8Array.from([0, 1]),
        curve: "linear",
      }),
      theme,
    });
    const paths = [...container.querySelectorAll("g.gg-paths > path")];
    expect(paths.map((path) => path.getAttribute("stroke-width"))).toEqual(["1", "5"]);
    expect(paths.map((path) => path.getAttribute("stroke-dasharray"))).toEqual([null, "6 4"]);
    expect(paths.map((path) => path.getAttribute("opacity"))).toEqual(["0.3", "0.9"]);
  });
});
