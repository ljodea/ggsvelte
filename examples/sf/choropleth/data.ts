/**
 * Toy already-projected regions as portable GeoJSON Geometry JSON strings
 * (ggsvelte geom_sf; #809). Coordinates are abstract map units — not a CRS.
 * Three stylised districts for a fill choropleth + centroid labels.
 */

function poly(rings: readonly (readonly [number, number])[][]): string {
  // Close each ring for GeoJSON.
  const closed = rings.map((ring) => {
    const first = ring[0]!;
    const last = ring.at(-1)!;
    if (first[0] === last[0] && first[1] === last[1]) return [...ring];
    return [...ring, first];
  });
  return JSON.stringify({ type: "Polygon", coordinates: closed });
}

/** District polygons in abstract projected units. */
export const districts: {
  geometry: string;
  district: string;
  rate: number;
}[] = [
  {
    district: "North",
    rate: 12,
    geometry: poly([
      [
        [0, 4],
        [6, 4],
        [6, 8],
        [0, 8],
      ],
    ]),
  },
  {
    district: "South-West",
    rate: 28,
    geometry: poly([
      [
        [0, 0],
        [3.5, 0],
        [3.5, 4],
        [0, 4],
      ],
    ]),
  },
  {
    district: "South-East",
    rate: 41,
    // Ring with a small interior hole (lake) to exercise even-odd fill.
    geometry: poly([
      [
        [3.5, 0],
        [6, 0],
        [6, 4],
        [3.5, 4],
      ],
      [
        [4.3, 1.2],
        [5.2, 1.2],
        [5.2, 2.4],
        [4.3, 2.4],
      ],
    ]),
  },
];
