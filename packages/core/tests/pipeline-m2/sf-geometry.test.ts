/**
 * Pure portable GeoJSON helpers for geom_sf / stat_sf_coordinates (#809).
 */
import { describe, expect, it } from "bun:test";

import { representativePoints } from "../../src/pipeline/sf-geometry.ts";

describe("representativePoints (#809 multi-part labels)", () => {
  it("returns one point for Point / LineString / Polygon", () => {
    expect(representativePoints("Point", [1, 2])).toEqual([[1, 2]]);
    expect(
      representativePoints("LineString", [
        [0, 0],
        [2, 0],
        [2, 2],
      ]),
    ).toEqual([[4 / 3, 2 / 3]]);
    // Unit square [0,2]×[0,2] exterior → centroid (1,1)
    expect(
      representativePoints("Polygon", [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ]),
    ).toEqual([[1, 1]]);
  });

  it("returns one point per MultiPoint vertex", () => {
    expect(
      representativePoints("MultiPoint", [
        [0, 0],
        [1, 1],
        [2, 3],
      ]),
    ).toEqual([
      [0, 0],
      [1, 1],
      [2, 3],
    ]);
  });

  it("returns one centroid per MultiPolygon part", () => {
    const pts = representativePoints("MultiPolygon", [
      [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
      [
        [
          [10, 10],
          [12, 10],
          [12, 12],
          [10, 12],
          [10, 10],
        ],
      ],
    ]);
    expect(pts).toEqual([
      [1, 1],
      [11, 11],
    ]);
  });

  it("returns one vertex-mean per MultiLineString part", () => {
    expect(
      representativePoints("MultiLineString", [
        [
          [0, 0],
          [2, 0],
        ],
        [
          [10, 10],
          [10, 12],
        ],
      ]),
    ).toEqual([
      [1, 0],
      [10, 11],
    ]);
  });

  it("skips empty / degenerate Multi* parts", () => {
    expect(
      representativePoints("MultiPoint", [
        [Number.NaN, 0],
        [1, 2],
      ]),
    ).toEqual([[1, 2]]);
    expect(
      representativePoints("MultiPolygon", [
        [[]],
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      ]),
    ).toEqual([[1, 1]]);
  });

  it("first multipolygon centroid is the first multi-part list entry", () => {
    // Production labels expand every part via representativePoints; first entry
    // is the historical single-point pick when only one label is needed.
    expect(
      representativePoints("MultiPolygon", [
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [12, 10],
            [12, 12],
            [10, 12],
            [10, 10],
          ],
        ],
      ])[0],
    ).toEqual([1, 1]);
  });
});
