/**
 * Spec surface for geom rect / tile / raster (#586).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg, normalize, validate } from "../src/index.ts";

describe("rect / tile / raster schema + builder", () => {
  it("normalize fills identity defaults for rect, tile, raster", () => {
    const spec = normalize({
      layers: [
        { geom: "rect", aes: { xmin: "a", xmax: "b", ymin: "c", ymax: "d" } },
        { geom: "tile", aes: { x: "x", y: "y" } },
        { geom: "raster", aes: { x: "x", y: "y" } },
      ],
    });
    expect(spec.layers.map((l) => [l.geom, l.stat, l.position])).toEqual([
      ["rect", "identity", "identity"],
      ["tile", "identity", "identity"],
      ["raster", "identity", "identity"],
    ]);
  });

  it("builder geomRect/geomTile/geomRaster produce canonical layers", () => {
    const rect = gg(undefined, aes({ xmin: "a", xmax: "b", ymin: "c", ymax: "d" }))
      .geomRect({ alpha: 0.5 })
      .spec();
    expect(rect.layers[0]).toMatchObject({
      geom: "rect",
      stat: "identity",
      params: { alpha: 0.5 },
    });

    const tile = gg(undefined, aes({ x: "x", y: "y" }))
      .geomTile({ width: 0.8, height: 0.8 })
      .spec();
    expect(tile.layers[0]).toMatchObject({
      geom: "tile",
      params: { width: 0.8, height: 0.8 },
    });

    const raster = gg(undefined, aes({ x: "x", y: "y", fill: "z" }))
      .geomRaster({ hjust: 0.5, vjust: 0.5 })
      .spec();
    expect(raster.layers[0]).toMatchObject({
      geom: "raster",
      params: { hjust: 0.5, vjust: 0.5 },
    });
  });

  it("requires rect edge channels", () => {
    const result = validate(
      {
        layers: [{ geom: "rect", aes: { xmin: { field: "a" } } }],
      },
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code);
      expect(codes.filter((c) => c === "missing-required-channel").length).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it("requires tile/raster x and y", () => {
    const tile = validate({ layers: [{ geom: "tile" }] }, {});
    expect(tile.ok).toBe(false);
    if (!tile.ok) {
      expect(tile.errors.some((e) => e.code === "missing-required-channel")).toBe(true);
    }
    const raster = validate({ layers: [{ geom: "raster" }] }, {});
    expect(raster.ok).toBe(false);
    if (!raster.ok) {
      expect(raster.errors.some((e) => e.code === "missing-required-channel")).toBe(true);
    }
  });

  it("rejects interpolate: true on raster params", () => {
    const result = validate({
      layers: [
        {
          geom: "raster",
          aes: { x: { field: "x" }, y: { field: "y" } },
          params: { interpolate: true },
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
