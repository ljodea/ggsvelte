/**
 * scale_*_steps{,2,n} authoring surface (#827).
 */
import { describe, expect, it } from "bun:test";

import {
  normalize,
  scaleColorSteps,
  scaleColorSteps2,
  scaleColorStepsn,
  scaleColourSteps,
  scaleFillStepsn,
  scale_color_steps,
  scale_color_steps2,
  scale_color_stepsn,
  scale_colour_steps,
  scale_fill_stepsn,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("steps scale helpers (#827)", () => {
  it("exports binding-identical color/colour camel and snake aliases", () => {
    expect(scaleColourSteps).toBe(scaleColorSteps);
    expect(scale_color_steps).toBe(scaleColorSteps);
    expect(scale_colour_steps).toBe(scaleColorSteps);
    expect(scale_color_steps2).toBe(scaleColorSteps2);
    expect(scale_color_stepsn).toBe(scaleColorStepsn);
    expect(scale_fill_stepsn).toBe(scaleFillStepsn);
  });

  it("steps defaults to binned two-stop range", () => {
    expect(scaleColorSteps()).toEqual({
      color: { type: "binned", range: ["#132B43", "#56B1F7"] },
    });
  });

  it("steps accepts low/high overrides", () => {
    expect(scaleColorSteps({ low: "#000000", high: "#ffffff" })).toEqual({
      color: { type: "binned", range: ["#000000", "#ffffff"] },
    });
  });

  it("steps2 defaults to binned three-stop diverging range", () => {
    expect(scaleColorSteps2()).toEqual({
      color: { type: "binned", range: ["#B2182B", "#F7F7F7", "#2166AC"] },
    });
  });

  it("stepsn accepts colours/colors/values aliases", () => {
    const stops = ["#000000", "#00ff00", "#ffffff"] as const;
    expect(scaleColorStepsn({ colours: [...stops] }).color?.range).toEqual([...stops]);
    expect(scaleColorStepsn({ colors: [...stops] }).color?.range).toEqual([...stops]);
    expect(scaleColorStepsn({ values: [...stops] }).color?.range).toEqual([...stops]);
  });

  it("stepsn throws when fewer than 2 stops", () => {
    expect(() => scaleColorStepsn({})).toThrow(/at least 2/);
    expect(() => scaleColorStepsn({ colours: ["#000000"] })).toThrow(/at least 2/);
  });

  it("helpers produce valid binned color specs", () => {
    for (const scales of [
      scaleColorSteps({ low: "#111111", high: "#eeeeee" }),
      scaleColorSteps2({ low: "#ff0000", mid: "#ffffff", high: "#0000ff" }),
      scaleColorStepsn({ colours: ["#000000", "#888888", "#ffffff"] }),
      scaleFillStepsn({ colors: ["#000000", "#ffffff"] }),
    ]) {
      const result = validate({
        data: {
          values: [
            { x: 1, y: 2, v: 0 },
            { x: 2, y: 3, v: 1 },
            { x: 3, y: 4, v: 2 },
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

  it("normalize preserves binned steps range", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2, v: 3 }] },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "v" } },
      layers: [point],
      scales: scaleColorSteps({ low: "#112233", high: "#aabbcc" }),
    });
    expect(spec.scales?.color).toMatchObject({
      type: "binned",
      range: ["#112233", "#aabbcc"],
    });
  });
});
