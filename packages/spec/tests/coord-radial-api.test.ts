/**
 * coord_radial / coord_polar public contract (ggplot2 polar coordinates).
 */
import { describe, expect, it } from "bun:test";

import {
  aes,
  coord_polar,
  coord_radial,
  coordPolar,
  coordRadial,
  gg,
  normalize,
  validate,
  type CoordSpec,
} from "../src/index.ts";

const rows = [
  { x: 1, y: 10, group: "a" },
  { x: 1, y: 20, group: "b" },
];

function result(coord: unknown) {
  return validate(
    normalize({
      data: { values: rows },
      layers: [{ geom: "col", aes: { x: { field: "x" }, y: { field: "y" } } }],
      coord: coord as never,
    }),
  );
}

describe("coord_radial public contract", () => {
  it("accepts radial coordinates with ggplot2 option surface", () => {
    expect(result({ type: "radial" }).ok).toBe(true);
    expect(result({ type: "radial", theta: "y" }).ok).toBe(true);
    expect(result({ type: "radial", theta: "x", start: Math.PI / 3 }).ok).toBe(true);
    expect(
      result({
        type: "radial",
        theta: "y",
        start: -0.4 * Math.PI,
        end: 0.4 * Math.PI,
        innerRadius: 0.3,
        expand: false,
        clip: true,
        reverse: "theta",
        thetaLimits: [200, 300],
        rLimits: [15, 30],
      }).ok,
    ).toBe(true);
  });

  it("rejects unknown variants, malformed options, and excess keys", () => {
    expect(result({ type: "polar" }).ok).toBe(false);
    expect(result({ type: "radial", theta: "z" }).ok).toBe(false);
    expect(result({ type: "radial", innerRadius: -0.1 }).ok).toBe(false);
    expect(result({ type: "radial", innerRadius: 1.1 }).ok).toBe(false);
    expect(result({ type: "radial", reverse: "xy" }).ok).toBe(false);
    expect(result({ type: "radial", start: "0" }).ok).toBe(false);
    expect(result({ type: "radial", end: [0, 1] }).ok).toBe(false);
    expect(result({ type: "radial", thetaLimits: [1] }).ok).toBe(false);
    expect(result({ type: "radial", rLimits: [1, 2, 3] }).ok).toBe(false);
    expect(result({ type: "radial", crs: "EPSG:4326" }).ok).toBe(false);
    expect(result({ type: "radial", direction: 1 }).ok).toBe(false);
  });

  it("normalizes helper, alias, builder, and canonical JSON equally", () => {
    expect(coord_radial).toBe(coordRadial);
    expect(coord_polar).toBe(coordPolar);
    const options = {
      theta: "y" as const,
      start: Math.PI / 3,
      expand: false,
    };
    const canonical: CoordSpec = {
      type: "radial",
      theta: "y",
      start: Math.PI / 3,
      expand: false,
    };
    expect(coordRadial(options)).toEqual(canonical);
    expect(coord_radial(options)).toEqual(canonical);
    expect(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomCol()
        .coordRadial(options)
        .spec().coord,
    ).toEqual(canonical);
  });

  it("canonicalizes defaults and maps coord_polar onto radial", () => {
    expect(coordRadial()).toEqual({ type: "radial" });
    expect(coordPolar()).toEqual({ type: "radial", clip: true });
    expect(coordPolar({ direction: -1 })).toEqual({
      type: "radial",
      clip: true,
      reverse: "theta",
    });
    expect(coordPolar({ theta: "y", start: 1, direction: 1 })).toEqual({
      type: "radial",
      theta: "y",
      start: 1,
      clip: true,
    });
    expect(
      normalize({
        layers: [{ geom: "point" }],
        coord: {
          type: "radial",
          theta: "x",
          start: 0,
          innerRadius: 0,
          expand: true,
          reverse: "none",
        },
      }).coord,
    ).toEqual({ type: "radial" });
  });

  it("keeps explicit non-default expand/clip/reverse", () => {
    expect(coordRadial({ expand: false, clip: true, reverse: "r" })).toEqual({
      type: "radial",
      expand: false,
      clip: true,
      reverse: "r",
    });
    expect(
      normalize({
        layers: [{ geom: "point" }],
        coord: { type: "radial", expand: false, clip: true, reverse: "thetar" },
      }).coord,
    ).toEqual({ type: "radial", expand: false, clip: true, reverse: "thetar" });
  });
});
