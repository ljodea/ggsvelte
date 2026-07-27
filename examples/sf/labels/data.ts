/**
 * Labeled polygons for geom_sf_text (#809 phase 2): region names at centroids.
 */
function poly(coords: [number, number][]): string {
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

export const labeledRegions: { geometry: string; region: string; rate: number }[] = [
  {
    region: "North",
    rate: 12,
    geometry: poly([
      [0, 2],
      [2, 2],
      [1, 4],
      [0, 2],
    ]),
  },
  {
    region: "East",
    rate: 28,
    geometry: poly([
      [2.2, 0],
      [4.2, 0],
      [4.2, 2],
      [2.2, 2],
      [2.2, 0],
    ]),
  },
  {
    region: "West",
    rate: 18,
    geometry: poly([
      [0, 0],
      [2, 0],
      [2, 1.8],
      [0, 1.8],
      [0, 0],
    ]),
  },
];
