/**
 * geom_count / stat_sum — normalize, validate, builder.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("count geom / sum stat (spec)", () => {
  it("normalize fills sum defaults and size after_stat n", () => {
    const spec = normalize({
      data: {
        values: [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
      },
      layers: [{ geom: "count", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "count",
      stat: "sum",
      position: "identity",
      aes: { size: { stat: "n" } },
    });
  });

  it("builder geomCount is binding-identical to JSON", () => {
    const built = gg(
      {
        x: [1, 1, 2],
        y: [1, 1, 2],
      },
      aes({ x: "x", y: "y" }),
    )
      .geomCount({ alpha: 0.7 })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "count",
      stat: "sum",
      params: { alpha: 0.7 },
      aes: { size: { stat: "n" } },
    });
  });

  it("point + stat sum also defaults size to n", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 1 }] },
      layers: [{ geom: "point", stat: "sum", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "point",
      stat: "sum",
      aes: { size: { stat: "n" } },
    });
  });

  it("requires x and y", () => {
    const result = validate(
      normalize({
        data: { values: [{ x: 1 }] },
        layers: [{ geom: "count", aes: { x: "x" } }],
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("missing-required-channel");
  });
});
