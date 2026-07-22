import { describe, expect, it } from "bun:test";

import {
  aes,
  coord_equal,
  coord_fixed,
  coordEqual,
  coordFixed,
  gg,
  normalize,
  validate,
  type CoordSpec,
} from "../src/index.ts";

const rows = [
  { x: 0, y: 0, group: "a" },
  { x: 10, y: 20, group: "b" },
];

function result(coord: unknown, facet?: unknown) {
  return validate(
    normalize({
      data: { values: rows },
      layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      ...(coord !== undefined && { coord: coord as never }),
      ...(facet !== undefined && { facet: facet as never }),
    }),
  );
}

describe("coord_fixed public contract", () => {
  it("accepts a strict positive finite physical unit ratio", () => {
    expect(result({ type: "fixed" }).ok).toBe(true);
    expect(result({ type: "fixed", ratio: 0.5 }).ok).toBe(true);
    expect(result({ type: "fixed", ratio: 2 }).ok).toBe(true);
    expect(result({ type: "fixed", ratio: 1_000_001 }).ok).toBe(true);

    for (const coord of [
      { type: "fixed", ratio: 0 },
      { type: "fixed", ratio: -1 },
      { type: "fixed", ratio: Number.POSITIVE_INFINITY },
      { type: "fixed", ratio: "1" },
      { type: "fixed", callback: "not portable" },
    ]) {
      expect(result(coord).ok).toBe(false);
    }
  });

  it("normalizes helper, aliases, builder, and canonical JSON equally", () => {
    expect(coord_fixed).toBe(coordFixed);
    expect(coord_equal).toBe(coordEqual);
    expect(coordEqual).toBe(coordFixed);

    const canonical: CoordSpec = { type: "fixed", ratio: 2 };
    expect(coordFixed({ ratio: 2 })).toEqual(canonical);
    expect(coord_fixed({ ratio: 2 })).toEqual(canonical);
    expect(coord_equal({ ratio: 2 })).toEqual(canonical);
    expect(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordFixed({ ratio: 2 })
        .spec().coord,
    ).toEqual(canonical);
    expect(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordEqual({ ratio: 2 })
        .spec().coord,
    ).toEqual(canonical);
  });

  it("canonicalizes the default ratio and explicit undefined", () => {
    expect(coordFixed()).toEqual({ type: "fixed" });
    expect(
      normalize({ layers: [{ geom: "point" }], coord: { type: "fixed", ratio: 1 } }).coord,
    ).toEqual({ type: "fixed" });
    expect(
      normalize({
        layers: [{ geom: "point" }],
        coord: { type: "fixed", ratio: undefined },
      } as never).coord,
    ).toEqual({ type: "fixed" });
  });

  it("rejects free positional facets before rendering with an actionable error", () => {
    for (const scales of ["free", "free_x", "free_y"] as const) {
      const checked = result({ type: "fixed" }, { wrap: "group", scales });
      expect(checked.ok).toBe(false);
      if (checked.ok) throw new Error("expected fixed/free incompatibility");
      const error = checked.errors.find((item) => item.code === "coord-fixed-free-scales");
      expect(error?.code).toBe("coord-fixed-free-scales");
      expect(error?.path).toBe("/facet/scales");
    }
    expect(result({ type: "fixed" }, { wrap: "group", scales: "fixed" }).ok).toBe(true);
  });
});
