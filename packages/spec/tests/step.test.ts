/**
 * Step geom — normalize, validate, builder surface (ggplot2 geom_step).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg, normalize, validate } from "../src/index.ts";

describe("step geom (spec)", () => {
  it("normalize fills identity/identity defaults", () => {
    const spec = normalize({
      data: { values: [{ x: 1, y: 2 }] },
      layers: [{ geom: "step", aes: { x: "x", y: "y" } }],
    });
    expect(spec.layers[0]).toMatchObject({
      geom: "step",
      stat: "identity",
      position: "identity",
    });
  });

  it("builder geomStep is binding-identical to the JSON form", () => {
    const built = gg({ x: [1, 2], y: [3, 4] }, aes({ x: "x", y: "y" }))
      .geomStep({ direction: "vh", alpha: 0.8, linewidth: 2 })
      .spec();
    expect(built.layers[0]).toMatchObject({
      geom: "step",
      params: { direction: "vh", alpha: 0.8, linewidth: 2 },
    });
  });

  it("defaults direction to hv when omitted", () => {
    const built = gg({ x: [0, 1], y: [0, 1] }, aes({ x: "x", y: "y" }))
      .geomStep()
      .spec();
    expect(built.layers[0]).toMatchObject({ geom: "step" });
    expect((built.layers[0] as { params?: { direction?: string } }).params?.direction).toBe(
      undefined,
    );
  });

  it("requires x and y", () => {
    const result = validate(
      {
        data: { values: [{ x: 1 }] },
        layers: [{ geom: "step", aes: { x: { field: "x" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain("missing-required-channel");
  });

  it("accepts direction hv | vh | mid", () => {
    for (const direction of ["hv", "vh", "mid"] as const) {
      const result = validate(
        {
          data: {
            values: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
          },
          layers: [
            {
              geom: "step",
              aes: { x: { field: "x" }, y: { field: "y" } },
              params: { direction },
            },
          ],
        },
        {},
      );
      expect(result.ok).toBe(true);
    }
  });

  it("rejects unknown direction", () => {
    const result = validate(
      {
        data: {
          values: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        },
        layers: [
          {
            geom: "step",
            aes: { x: { field: "x" }, y: { field: "y" } },
            params: { direction: "diagonal" as "hv" },
          },
        ],
      },
      {},
    );
    expect(result.ok).toBe(false);
  });
});
