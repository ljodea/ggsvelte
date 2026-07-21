import { describe, expect, it } from "bun:test";

import {
  aes,
  coord_transform,
  coordTransform,
  gg,
  normalize,
  validate,
  type CoordSpec,
} from "../src/index.ts";

function result(coord: unknown) {
  return validate(
    normalize({
      data: { values: [{ x: 1, y: 1 }] },
      layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      coord: coord as never,
    }),
  );
}

describe("coord_transform public contract", () => {
  it("accepts strict independent coordinate axis transforms", () => {
    expect(result({ type: "transform", x: { transform: "log10" } }).ok).toBe(true);
    expect(result({ type: "transform", y: { transform: "sqrt" } }).ok).toBe(true);
    expect(
      result({
        type: "transform",
        x: { transform: "identity", limits: [1, 100], reverse: true, expand: false },
        y: { transform: "sqrt" },
        clip: false,
      }).ok,
    ).toBe(true);
  });

  it("rejects unknown coordinate variants, transforms, malformed limits, and excess keys", () => {
    expect(result({ type: "polar" }).ok).toBe(false);
    expect(result(null).ok).toBe(false);
    expect(result({ type: "cartesian", callback: "x" }).ok).toBe(false);
    expect(result({ type: "flip", callback: "x" }).ok).toBe(false);
    expect(result({ type: "transform", x: { transform: "ln" } }).ok).toBe(false);
    expect(result({ type: "transform", x: { transform: "log10", limits: [1] } }).ok).toBe(false);
    expect(result({ type: "transform", x: { transform: "log10", limits: [1, 2, 3] } }).ok).toBe(
      false,
    );
    expect(result({ type: "transform", x: { transform: "log10", callback: "x" } }).ok).toBe(false);
    expect(result({ type: "transform", x: { transform: "identity", callback: "x" } }).ok).toBe(
      false,
    );
    expect(result({ type: "transform", x: { transform: "log10" }, tolerance: 100 }).ok).toBe(false);
  });

  it("normalizes helper, alias, builder, and canonical JSON equally", () => {
    expect(coord_transform).toBe(coordTransform);
    const options = {
      x: "log10" as const,
      y: { transform: "sqrt" as const, limits: [0, 100] as [number, number], reverse: true },
      clip: false,
    };
    const canonical: CoordSpec = {
      type: "transform",
      x: { transform: "log10" },
      y: { transform: "sqrt", limits: [0, 100], reverse: true },
      clip: false,
    };
    expect(coordTransform(options)).toEqual(canonical);
    expect(
      gg([{ x: 1, y: 1 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordTransform(options)
        .spec().coord,
    ).toEqual(canonical);
    expect(
      gg([{ x: 1, y: 1 }], aes({ x: "x", y: "y" }))
        .geomPoint()
        .coord(canonical)
        .spec().coord,
    ).toEqual(canonical);
  });

  it("canonicalizes identity-only defaults away", () => {
    expect(
      normalize({
        layers: [{ geom: "point" }],
        coord: { type: "transform", x: { transform: "identity" } },
      } as never).coord,
    ).toBeUndefined();
    expect(coordTransform()).toEqual({ type: "cartesian" });
    expect(coordTransform({ clip: true })).toEqual({ type: "cartesian" });
  });
});
