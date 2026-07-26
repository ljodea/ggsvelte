/**
 * #829 scale_*_hue / grey / gray / ordinal authoring helpers.
 */
import { describe, expect, it } from "bun:test";

import {
  normalize,
  scaleColorDiscrete,
  scaleColorGray,
  scaleColorGrey,
  scaleColorHue,
  scaleColorOrdinal,
  scaleColourHue,
  scaleFillGrey,
  scale_color_gray,
  scale_color_hue,
  scale_color_ordinal,
  validate,
} from "../src/index.js";

const point = { geom: "point" as const };

describe("hue / grey / ordinal scale helpers (#829)", () => {
  it("exports binding-identical aliases", () => {
    expect(scaleColourHue).toBe(scaleColorHue);
    expect(scale_color_hue).toBe(scaleColorHue);
    expect(scaleColorGray).toBe(scaleColorGrey);
    expect(scale_color_gray).toBe(scaleColorGrey);
    expect(scaleColorOrdinal).toBe(scaleColorDiscrete);
    expect(scale_color_ordinal).toBe(scaleColorDiscrete);
  });

  it("emits scheme hue / grey with defaults", () => {
    expect(scaleColorHue()).toEqual({ color: { type: "ordinal", scheme: "hue" } });
    expect(scaleColorGrey()).toEqual({ color: { type: "ordinal", scheme: "grey" } });
    expect(scaleColorGray()).toEqual({ color: { type: "ordinal", scheme: "grey" } });
    expect(scaleColorOrdinal()).toEqual({ color: { type: "ordinal" } });
  });

  it("normalizes scheme gray to grey", () => {
    const spec = normalize({
      layers: [point],
      scales: { color: { type: "ordinal", scheme: "gray" } },
    });
    expect(spec.scales?.color?.scheme).toBe("grey");
  });

  it("materialises custom hue/grey params when domain is explicit", () => {
    const hue = scaleColorHue({ domain: ["a", "b", "c"], h: [0, 180], c: 50, l: 50 });
    expect(hue.color?.type).toBe("ordinal");
    expect(hue.color?.domain).toEqual(["a", "b", "c"]);
    expect(hue.color?.range).toHaveLength(3);
    expect(hue.color?.scheme).toBeUndefined();

    const grey = scaleFillGrey({ domain: ["x", "y"], start: 0, end: 1 });
    expect(grey.fill?.range).toEqual(["#000000", "#ffffff"]);
  });

  it("throws when non-default params lack domain", () => {
    expect(() => scaleColorHue({ c: 50 })).toThrow(/explicit domain/);
    expect(() => scaleColorGrey({ start: 0.1 })).toThrow(/explicit domain/);
  });

  it("validates portable hue/grey specs", () => {
    for (const scales of [scaleColorHue(), scaleColorGrey(), scaleFillGrey()]) {
      const result = validate({
        data: { values: [{ x: 1, y: 2, c: "a" }] },
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
        layers: [point],
        scales,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
    }
  });
});
