/**
 * ecdf stat — normalize / validate / builder surface.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("ecdf stat (spec)", () => {
  it("normalize defaults y to { stat: ecdf }", () => {
    const spec = normalize({
      data: { values: [{ x: 1 }, { x: 2 }] },
      layers: [{ geom: "line", stat: "ecdf", aes: { x: "x" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "line",
      stat: "ecdf",
      aes: { x: { field: "x" }, y: { stat: "ecdf" } },
    });
  });

  it("builder geomLine({stat:ecdf}) is binding-identical to JSON", () => {
    const built = gg({ x: [1, 2, 3] }, aes({ x: "x" }))
      .geomLine({ stat: "ecdf", curve: "step-hv", pad: true })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "line",
      stat: "ecdf",
      params: { curve: "step-hv", pad: true },
      aes: { y: { stat: "ecdf" } },
    });
  });

  it("accepts ecdf with only x mapped (after normalize fills y)", () => {
    const result = validate(
      normalize({
        data: { values: [{ x: 1 }, { x: 2 }] },
        layers: [
          {
            geom: "line",
            stat: "ecdf",
            aes: { x: "x" },
            params: { curve: "step-hv" },
          },
        ],
      }),
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("rejects field y with ecdf", () => {
    const result = validate(
      {
        data: {
          values: [
            { x: 1, y: 9 },
            { x: 2, y: 8 },
          ],
        },
        layers: [
          {
            geom: "line",
            stat: "ecdf",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("computed-y-mapped");
  });
});
