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

  it("rejects GeometryCollection without geometries array", () => {
    expect(() => expandSfLeaves({ type: "GeometryCollection" }, "/test")).toThrow(PipelineError);
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
});
