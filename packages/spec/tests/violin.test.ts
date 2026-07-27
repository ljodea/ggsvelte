/**
 * Violin geom — normalize, validate, builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("violin geom (spec)", () => {
  it("normalize defaults ydensity + dodge", () => {
    const spec = normalize({
      data: {
        values: [
          { x: "a", y: 1 },
          { x: "a", y: 2 },
        ],
      },
      layers: [{ geom: "violin", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "violin",
      stat: "ydensity",
      position: "dodge",
    });
  });

  it("builder geomViolin matches JSON form", () => {
    const built = gg({ x: ["a", "a", "b", "b"], y: [1, 2, 3, 4] }, aes({ x: "x", y: "y" }))
      .geomViolin({ scale: "width", trim: true, alpha: 0.8 })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "violin",
      params: { scale: "width", trim: true, alpha: 0.8 },
    });
  });

  it("requires x and y", () => {
    const result = validate(
      {
        data: { values: [{ y: 1 }] },
        layers: [{ geom: "violin", aes: { y: { field: "y" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("missing-required-channel");
  });

  it("accepts complete x/y mapping", () => {
    const result = validate(
      {
        data: {
          values: [
            { x: "a", y: 1 },
            { x: "a", y: 2 },
            { x: "b", y: 3 },
            { x: "b", y: 4 },
          ],
        },
        layers: [
          {
            geom: "violin",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
