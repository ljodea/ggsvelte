/**
 * Pure GeometryCollection expand (#809 phase 6).
 */
import { describe, expect, it } from "bun:test";

import { expandSfLeaves, representativePointsForGeometry } from "../../src/pipeline/sf-geometry.ts";
import { PipelineError } from "../../src/pipeline/types.ts";

describe("expandSfLeaves (#809 GeometryCollection)", () => {
  it("flattens a homogeneous GeometryCollection to leaves", () => {
    const leaves = expandSfLeaves(
      {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [1, 2] },
          { type: "Point", coordinates: [3, 4] },
        ],
      },
      "/test",
    );
    expect(leaves).toEqual([
      { type: "Point", coordinates: [1, 2] },
      { type: "Point", coordinates: [3, 4] },
    ]);
  });

  it("recursively flattens nested GeometryCollections", () => {
    const leaves = expandSfLeaves(
      {
        type: "GeometryCollection",
        geometries: [
          {
            type: "GeometryCollection",
            geometries: [{ type: "Point", coordinates: [0, 0] }],
          },
          {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [2, 0],
                [2, 2],
                [0, 2],
                [0, 0],
              ],
            ],
          },
        ],
      },
      "/test",
    );
    expect(leaves.map((l) => l.type)).toEqual(["Point", "Polygon"]);
  });

  it("returns empty for empty GeometryCollection", () => {
    expect(expandSfLeaves({ type: "GeometryCollection", geometries: [] }, "/test")).toEqual([]);
  });

  it("passes through leaf geometries", () => {
    expect(expandSfLeaves({ type: "Point", coordinates: [1, 1] }, "/test")).toEqual([
      { type: "Point", coordinates: [1, 1] },
    ]);
  });

  it("rejects GeometryCollection nesting beyond the depth cap", () => {
    let nest: Record<string, unknown> = { type: "Point", coordinates: [0, 0] };
    for (let i = 0; i < 40; i++) {
      nest = { type: "GeometryCollection", geometries: [nest] };
    }
    expect(() => expandSfLeaves(nest as never, "/test")).toThrow(/nesting exceeds/);
  });

  it("rejects GeometryCollection without geometries array", () => {
    expect(() => expandSfLeaves({ type: "GeometryCollection" }, "/test")).toThrow(PipelineError);
  });

  it("flattens a nested GeometryCollection past the engine spread argument limit (#1344)", () => {
    // Nested GC: parent spreads the child's full leaf list into push(...).
    // Flat GC of N Points does not crash (each child expands to one leaf).
    // Engine limit is runtime-specific; on Bun 1.3.x bare push(...arr) ok at
    // 5e5 and throws at 1e6 — pin n so the regression stays meaningful.
    const n = 1_000_000;
    const bulk = Array.from({ length: n }, () => 0);
    expect(() => {
      Array.prototype.push.apply([], bulk);
    }).toThrow(RangeError);

    const inner = Array.from({ length: n }, (_, i) => ({
      type: "Point" as const,
      coordinates: [i, i] as [number, number],
    }));
    const leaves = expandSfLeaves(
      {
        type: "GeometryCollection",
        geometries: [{ type: "GeometryCollection", geometries: inner }],
      },
      "/test",
    );
    expect(leaves).toHaveLength(n);
    expect(leaves[0]).toEqual({ type: "Point", coordinates: [0, 0] });
    expect(leaves[n - 1]).toEqual({ type: "Point", coordinates: [n - 1, n - 1] });
  });
});

describe("representativePointsForGeometry (#809 GC labels)", () => {
  it("one point per GeometryCollection leaf", () => {
    const pts = representativePointsForGeometry(
      {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [0, 0] },
          { type: "Point", coordinates: [2, 2] },
        ],
      },
      "/test",
    );
    expect(pts).toEqual([
      [0, 0],
      [2, 2],
    ]);
  });

  it("expands MultiPoint past the engine spread argument limit (#1344)", () => {
    // representativePointsForGeometry pushes each leaf's points via spread;
    // MultiPoint with n positions returns n points, then one push(...pts).
    const n = 1_000_000;
    const bulk = Array.from({ length: n }, () => 0);
    expect(() => {
      Array.prototype.push.apply([], bulk);
    }).toThrow(RangeError);

    const coordinates = Array.from({ length: n }, (_, i) => [i, i] as [number, number]);
    const pts = representativePointsForGeometry({ type: "MultiPoint", coordinates }, "/test");
    expect(pts).toHaveLength(n);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[n - 1]).toEqual([n - 1, n - 1]);
  });
});
