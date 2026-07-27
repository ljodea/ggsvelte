/**
 * scale_*_hue / grey / gray / ordinal authoring surface (#829).
 */
import { describe, expect, it } from "bun:test";

import {
  GREY_PALETTE_10,
  HUE_PALETTE_10,
  normalize,
  scaleColorDiscrete,
  scaleColorGray,
  scaleColorGrey,
  scaleColorHue,
  scaleColorOrdinal,
  scaleColourHue,
  scale_color_gray,
  scale_color_grey,
  scale_color_hue,
  scale_color_ordinal,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("hue/grey/ordinal scale helpers (#829)", () => {
  it("exports binding-identical aliases", () => {
    expect(scaleColourHue).toBe(scaleColorHue);
    expect(scale_color_hue).toBe(scaleColorHue);
    expect(scaleColorGray).toBe(scaleColorGrey);
    expect(scale_color_gray).toBe(scaleColorGrey);
    expect(scale_color_grey).toBe(scaleColorGrey);
    expect(scaleColorOrdinal).toBe(scaleColorDiscrete);
    expect(scale_color_ordinal).toBe(scaleColorDiscrete);
  });

  it("hue defaults to named scheme hue (portable)", () => {
    expect(scaleColorHue()).toEqual({
      color: { type: "ordinal", scheme: "hue" },
    });
  });

  it("hue with h/c/l bakes a discrete range", () => {
    const scales = scaleColorHue({ h: [0, 180], c: 80, l: 50 });
    expect(scales.color?.type).toBe("ordinal");
    expect(scales.color?.scheme).toBeUndefined();
    expect(scales.color?.range).toHaveLength(10);
    expect(scales.color?.range?.[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("grey defaults to named scheme grey", () => {
    expect(scaleColorGrey()).toEqual({
      color: { type: "ordinal", scheme: "grey" },
    });
  });

  it("grey with start/end bakes a greyscale range", () => {
    const scales = scaleColorGrey({ start: 0, end: 1 });
    expect(scales.color?.range).toHaveLength(10);
    expect(scales.color?.range?.[0]).toBe("#000000");
    expect(scales.color?.range?.at(-1)).toBe("#ffffff");
  });

  it("default hue/grey scheme tables match exported palettes", () => {
    expect(HUE_PALETTE_10).toHaveLength(10);
    expect(GREY_PALETTE_10).toHaveLength(10);
    expect(GREY_PALETTE_10[0]).toBe("#333333");
    expect(GREY_PALETTE_10.at(-1)).toBe("#cccccc");
  });

  it("helpers produce valid ordinal color specs", () => {
    for (const scales of [
      scaleColorHue(),
      scaleColorGrey(),
      scaleColorOrdinal({ scheme: "tableau10" }),
    ]) {
      const result = validate({
        data: {
          values: [
            { x: 1, y: 2, g: "a" },
            { x: 2, y: 3, g: "b" },
          ],
        },
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } },
        layers: [point],
        scales,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
    }
  });

  it("normalize preserves scheme hue", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2, g: "a" }] },
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "g" } },
      layers: [point],
      scales: scaleColorHue(),
    });
    expect(spec.scales?.color).toMatchObject({ type: "ordinal", scheme: "hue" });
  });
});
