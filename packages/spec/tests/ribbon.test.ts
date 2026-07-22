/**
 * Ribbon geom — normalize, validate, builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("ribbon geom (spec)", () => {
  it("normalize fills identity/identity defaults", () => {
    const spec = normalize({
      data: { values: [{ x: 1, lo: 0, hi: 2 }] },
      layers: [{ geom: "ribbon", aes: { x: "x", ymin: "lo", ymax: "hi" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "ribbon",
      stat: "identity",
      position: "identity",
    });
  });

  it("builder geomRibbon is binding-identical to the JSON form", () => {
    const built = gg({ x: [1, 2], lo: [0, 1], hi: [2, 3] }, aes({ x: "x", ymin: "lo", ymax: "hi" }))
      .geomRibbon({ alpha: 0.4, outline: "upper" })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "ribbon",
      params: { alpha: 0.4, outline: "upper" },
    });
  });

  it("requires ymin and ymax for the x-orientation contract", () => {
    // Tier-2 structural grammar is opt-in via options (same as other geoms).
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2 }] },
        layers: [{ geom: "ribbon", aes: { x: { field: "x" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain("missing-required-channel");
  });

  it("accepts the y-orientation contract (y+xmin+xmax)", () => {
    const result = validate(
      {
        data: { values: [{ y: 1, lo: 0, hi: 2 }] },
        layers: [
          {
            geom: "ribbon",
            aes: { y: { field: "y" }, xmin: { field: "lo" }, xmax: { field: "hi" } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("errors when both orientation contracts are mapped without params.orientation", () => {
    const result = validate(
      {
        data: {
          values: [{ x: 1, y: 1, ymin: 0, ymax: 2, xmin: 0, xmax: 2 }],
        },
        layers: [
          {
            geom: "ribbon",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              ymin: { field: "ymin" },
              ymax: { field: "ymax" },
              xmin: { field: "xmin" },
              xmax: { field: "xmax" },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "ribbon-orientation-ambiguous")).toBe(true);
  });

  it("rejects unknown outline enum values", () => {
    const result = validate({
      data: { values: [{ x: 1, lo: 0, hi: 2 }] },
      layers: [
        {
          geom: "ribbon",
          aes: { x: { field: "x" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
          params: { outline: "diagonal" as "both" },
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
