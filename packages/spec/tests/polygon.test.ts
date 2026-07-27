/**
 * Polygon geom — normalize, validate, builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("polygon geom (spec)", () => {
  it("normalize fills identity/identity defaults", () => {
    const spec = normalize({
      data: {
        values: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0.5, y: 1 },
        ],
      },
      layers: [{ geom: "polygon", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "polygon",
      stat: "identity",
      position: "identity",
    });
  });

  it("builder geomPolygon is binding-identical to the JSON form", () => {
    const built = gg(
      {
        x: [0, 1, 0.5],
        y: [0, 0, 1],
      },
      aes({ x: "x", y: "y" }),
    )
      .geomPolygon({ alpha: 0.5, linewidth: 2 })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "polygon",
      params: { alpha: 0.5, linewidth: 2 },
    });
  });

  it("requires x and y", () => {
    const result = validate(
      {
        data: { values: [{ x: 1 }] },
        layers: [{ geom: "polygon", aes: { x: { field: "x" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("missing-required-channel");
    expect(result.errors.map((e) => e.path).join(" ")).toMatch(/y/);
  });

  it("accepts a complete x/y mapping with group and fill", () => {
    const result = validate(
      {
        data: {
          values: [
            { x: 0, y: 0, id: "a" },
            { x: 1, y: 0, id: "a" },
            { x: 0.5, y: 1, id: "a" },
          ],
        },
        layers: [
          {
            geom: "polygon",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              group: { field: "id" },
              fill: { field: "id" },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
