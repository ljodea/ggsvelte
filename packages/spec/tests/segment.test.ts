/**
 * Segment geom — normalize, validate, builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("segment geom (spec)", () => {
  it("normalize fills identity/identity defaults", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2, xend: 3, yend: 4 }] },
      layers: [
        {
          geom: "segment",
          aes: { x: "x", y: "y", xend: "xend", yend: "yend" },
        },
      ],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "segment",
      stat: "identity",
      position: "identity",
    });
  });

  it("builder geomSegment is binding-identical to the JSON form", () => {
    const built = gg(
      { x: [1, 2], y: [3, 4], xend: [5, 6], yend: [7, 8] },
      aes({ x: "x", y: "y", xend: "xend", yend: "yend" }),
    )
      .geomSegment({ alpha: 0.5, linewidth: 2, lineend: "round" })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "segment",
      params: { alpha: 0.5, linewidth: 2, lineend: "round" },
    });
  });

  it("requires x, y, xend, and yend", () => {
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2 }] },
        layers: [{ geom: "segment", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain("missing-required-channel");
    const paths = result.errors.map((e) => e.path).join(" ");
    expect(paths).toMatch(/xend|yend/);
  });

  it("accepts a complete four-endpoint mapping", () => {
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2, xend: 3, yend: 4 }] },
        layers: [
          {
            geom: "segment",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              xend: { field: "xend" },
              yend: { field: "yend" },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("rejects constant (non-field) segment endpoints", () => {
    // Runtime only materializes field endpoints; constants must not pass validate.
    const result = validate(
      {
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "segment",
            aes: {
              x: { field: "x" },
              y: { field: "y" },
              xend: { value: 3 },
              yend: { value: 4 },
            },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "missing-required-channel")).toBe(true);
    expect(result.errors.map((e) => e.path).join(" ")).toMatch(/xend|yend/);
  });
});
