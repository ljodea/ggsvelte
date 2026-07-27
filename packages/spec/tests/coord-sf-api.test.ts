/**
 * coord_sf public contract (#809 phase 8).
 */
import { describe, expect, it } from "bun:test";

import { aes, coord_sf, coordSf, gg, normalize, validate, type CoordSpec } from "../src/index.ts";

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

describe("coord_sf public contract (#809)", () => {
  it("accepts fixed-aspect sf coordinates with optional ratio", () => {
    expect(result({ type: "sf" }).ok).toBe(true);
    expect(result({ type: "sf", ratio: 0.5 }).ok).toBe(true);
    expect(result({ type: "sf", ratio: 2 }).ok).toBe(true);
    for (const coord of [
      { type: "sf", ratio: 0 },
      { type: "sf", ratio: -1 },
      { type: "sf", crs: "EPSG:4326" },
    ]) {
      expect(result(coord).ok).toBe(false);
    }
  });

  it("normalizes helper, builder, and canonical JSON equally", () => {
    expect(coord_sf).toBe(coordSf);
    const canonical: CoordSpec = { type: "sf", ratio: 2 };
    expect(coordSf({ ratio: 2 })).toEqual(canonical);
    expect(coord_sf({ ratio: 2 })).toEqual(canonical);
    expect(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint()
        .coordSf({ ratio: 2 })
        .spec().coord,
    ).toEqual(canonical);
  });

  it("canonicalizes the default ratio", () => {
    expect(coordSf()).toEqual({ type: "sf" });
    expect(
      normalize({ layers: [{ geom: "point" }], coord: { type: "sf", ratio: 1 } }).coord,
    ).toEqual({ type: "sf" });
  });

  it("rejects free positional facets with the shared fixed-aspect error", () => {
    for (const scales of ["free", "free_x", "free_y"] as const) {
      const checked = result({ type: "sf" }, { wrap: "group", scales });
      expect(checked.ok).toBe(false);
      if (checked.ok) throw new Error("expected sf/free incompatibility");
      const error = checked.errors.find((item) => item.code === "coord-fixed-free-scales");
      expect(error?.code).toBe("coord-fixed-free-scales");
      expect(error?.message).toContain("coord_sf");
    }
  });
});
