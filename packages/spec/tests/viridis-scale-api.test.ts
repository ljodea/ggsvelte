/**
 * scale_*_viridis_{c,d,b} authoring surface (#828).
 */
import { describe, expect, it } from "bun:test";

import {
  normalize,
  PLASMA_RAMP_10,
  scaleColorViridisB,
  scaleColorViridisC,
  scaleColorViridisD,
  scaleColourViridisC,
  scaleFillViridisC,
  scale_color_viridis_b,
  scale_color_viridis_c,
  scale_color_viridis_d,
  scale_colour_viridis_c,
  scale_fill_viridis_c,
  validate,
  VIRIDIS_RAMP_10,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("viridis scale helpers (#828)", () => {
  it("exports binding-identical color/colour camel and snake aliases", () => {
    expect(scaleColourViridisC).toBe(scaleColorViridisC);
    expect(scale_color_viridis_c).toBe(scaleColorViridisC);
    expect(scale_colour_viridis_c).toBe(scaleColorViridisC);
    expect(scale_color_viridis_d).toBe(scaleColorViridisD);
    expect(scale_color_viridis_b).toBe(scaleColorViridisB);
    expect(scale_fill_viridis_c).toBe(scaleFillViridisC);
  });

  it("viridis_c defaults to sequential scheme viridis", () => {
    expect(scaleColorViridisC()).toEqual({
      color: { type: "sequential", scheme: "viridis", reverse: false },
    });
  });

  it("viridis_c maps option and direction onto scheme/reverse", () => {
    expect(scaleColorViridisC({ option: "plasma", direction: -1 })).toEqual({
      color: { type: "sequential", scheme: "plasma", reverse: true },
    });
  });

  it("viridis_b is binned with the same option mapping", () => {
    expect(scaleColorViridisB({ option: "magma" })).toEqual({
      color: { type: "binned", scheme: "magma", reverse: false },
    });
  });

  it("viridis_d bakes a discrete range (no sequential scheme on ordinal)", () => {
    const scales = scaleColorViridisD({ option: "plasma" });
    expect(scales.color?.type).toBe("ordinal");
    expect(scales.color?.scheme).toBeUndefined();
    expect(scales.color?.range).toEqual([...PLASMA_RAMP_10]);
  });

  it("viridis_d reverses the baked range when direction is -1", () => {
    const scales = scaleColorViridisD({ option: "viridis", direction: -1 });
    expect(scales.color?.range).toEqual([...VIRIDIS_RAMP_10].toReversed());
  });

  it("helpers produce valid specs", () => {
    for (const scales of [
      scaleColorViridisC({ option: "turbo" }),
      scaleColorViridisD({ option: "cividis" }),
      scaleColorViridisB({ option: "inferno" }),
      scaleFillViridisC(),
    ]) {
      const result = validate({
        data: {
          values: [
            { x: 1, y: 2, g: "a", v: 1 },
            { x: 2, y: 3, g: "b", v: 2 },
          ],
        },
        aes: {
          x: { field: "x" },
          y: { field: "y" },
          color: { field: scales.color !== undefined ? "v" : "g" },
          ...(scales.fill !== undefined && { fill: { field: "v" } }),
        },
        layers: [point],
        scales,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
    }
  });

  it("normalize preserves viridis_c scheme", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2, v: 3 }] },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "v" } },
      layers: [point],
      scales: scaleColorViridisC({ option: "plasma" }),
    });
    expect(spec.scales?.color).toMatchObject({ type: "sequential", scheme: "plasma" });
  });
});
