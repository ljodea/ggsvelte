/**
 * Function geom/stat — normalize, validate, builder surface.
 */
import { describe, expect, it } from "bun:test";
import { gg, normalize, validate } from "../src/index.ts";

describe("function geom (spec)", () => {
  it("normalize defaults stat function and y: { stat: y }", () => {
    const spec = normalize({
      data: { values: [{ x: 0 }] },
      layers: [
        {
          geom: "function",
          params: { fun: "dnorm", xlim: [-3, 3] },
        },
      ],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "function",
      stat: "function",
      position: "identity",
      aes: { y: { stat: "y" } },
    });
  });

  it("builder geomFunction is binding-identical to the JSON form", () => {
    const built = gg({ x: [0] })
      .geomFunction({
        fun: "dnorm",
        n: 51,
        xlim: [-2, 2],
        args: { mean: 0, sd: 1 },
        alpha: 0.9,
      })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "function",
      params: {
        fun: "dnorm",
        n: 51,
        xlim: [-2, 2],
        args: { mean: 0, sd: 1 },
        alpha: 0.9,
      },
    });
  });

  it("requires fun param", () => {
    const result = validate(
      {
        data: { values: [{ x: 0 }] },
        layers: [{ geom: "function", params: { xlim: [-1, 1] } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
  });

  it("rejects data-mapped y (computed by the function stat)", () => {
    const result = validate(
      {
        data: { values: [{ x: 0, y: 1 }] },
        layers: [
          {
            geom: "function",
            aes: { y: { field: "y" } },
            params: { fun: "identity", xlim: [0, 1] },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "computed-y-mapped")).toBe(true);
  });

  it("accepts a complete portable function layer", () => {
    const result = validate(
      {
        data: { values: [{ x: 0 }] },
        layers: [
          {
            geom: "function",
            params: { fun: "pnorm", n: 11, xlim: [-1, 1], args: { mean: 0, sd: 1 } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });
});
