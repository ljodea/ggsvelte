/**
 * Path geom — normalize, validate, builder surface (#788).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("path geom (spec)", () => {
  it("normalize fills identity/identity defaults", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "path", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "path",
      stat: "identity",
      position: "identity",
    });
  });

  it("builder geomPath is binding-identical to the JSON form", () => {
    const built = gg({ x: [1, 2, 0], y: [3, 4, 1] }, aes({ x: "x", y: "y" }))
      .geomPath({ alpha: 0.5, linewidth: 2, curve: "linear" })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "path",
      params: { alpha: 0.5, linewidth: 2, curve: "linear" },
    });
  });

  it("requires x and y", () => {
    const result = validate(
      {
        data: { values: [{ x: 1 }] },
        layers: [{ geom: "path", aes: { x: { field: "x" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("missing-required-channel");
  });

  it("accepts a complete x/y mapping", () => {
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "path",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
