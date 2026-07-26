/**
 * scale_*_gradient{,2,n} authoring surface (#826).
 */
import { describe, expect, it } from "bun:test";

import {
  normalize,
  scaleColorGradient,
  scaleColorGradient2,
  scaleColorGradientn,
  scaleColourGradient,
  scaleFillGradientn,
  scale_color_gradient,
  scale_color_gradient2,
  scale_color_gradientn,
  scale_colour_gradient,
  scale_fill_gradientn,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("gradient scale helpers (#826)", () => {
  it("exports binding-identical color/colour camel and snake aliases", () => {
    expect(scaleColourGradient).toBe(scaleColorGradient);
    expect(scale_color_gradient).toBe(scaleColorGradient);
    expect(scale_colour_gradient).toBe(scaleColorGradient);
    expect(scale_color_gradient2).toBe(scaleColorGradient2);
    expect(scale_color_gradientn).toBe(scaleColorGradientn);
    expect(scale_fill_gradientn).toBe(scaleFillGradientn);
  });

  it("gradient defaults to two-stop sequential range", () => {
    expect(scaleColorGradient()).toEqual({
      color: { type: "sequential", range: ["#132B43", "#56B1F7"] },
    });
  });

  it("gradient accepts low/high overrides", () => {
    expect(scaleColorGradient({ low: "#000000", high: "#ffffff" })).toEqual({
      color: { type: "sequential", range: ["#000000", "#ffffff"] },
    });
  });

  it("gradient2 defaults to three-stop diverging range", () => {
    expect(scaleColorGradient2()).toEqual({
      color: { type: "sequential", range: ["#B2182B", "#F7F7F7", "#2166AC"] },
    });
  });

  it("gradientn accepts colours/colors/values aliases", () => {
    const stops = ["#000000", "#00ff00", "#ffffff"] as const;
    expect(scaleColorGradientn({ colours: [...stops] }).color?.range).toEqual([...stops]);
    expect(scaleColorGradientn({ colors: [...stops] }).color?.range).toEqual([...stops]);
    expect(scaleColorGradientn({ values: [...stops] }).color?.range).toEqual([...stops]);
  });

  it("gradientn throws when fewer than 2 stops", () => {
    expect(() => scaleColorGradientn({})).toThrow(/at least 2/);
    expect(() => scaleColorGradientn({ colours: ["#000000"] })).toThrow(/at least 2/);
  });

  it("helpers produce valid continuous color specs", () => {
    for (const scales of [
      scaleColorGradient({ low: "#111111", high: "#eeeeee" }),
      scaleColorGradient2({ low: "#ff0000", mid: "#ffffff", high: "#0000ff" }),
      scaleColorGradientn({ colours: ["#000000", "#888888", "#ffffff"] }),
      scaleFillGradientn({ colors: ["#000000", "#ffffff"] }),
    ]) {
      const result = validate({
        data: {
          values: [
            { x: 1, y: 2, v: 0 },
            { x: 2, y: 3, v: 1 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          ...(scales.color !== undefined ? { color: { field: "v" } } : { fill: { field: "v" } }),
        },
        layers: [point],
        scales,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
    }
  });

  it("normalize preserves gradient range", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2, v: 3 }] },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "v" } },
      layers: [point],
      scales: scaleColorGradient({ low: "#112233", high: "#aabbcc" }),
    });
    expect(spec.scales?.color).toMatchObject({
      type: "sequential",
      range: ["#112233", "#aabbcc"],
    });
  });
});
