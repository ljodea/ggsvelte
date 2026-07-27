/**
 * Three already-projected triangle polygons as GeoJSON Geometry JSON strings.
 * Portable CellValue encoding for geom_sf (#809 phase 1). Integers only.
 */
function poly(coords: [number, number][]): string {
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

export const triangles: { geometry: string; region: string; rate: number }[] = [
  {
    region: "A",
    rate: 12,
    geometry: poly([
      [0, 0],
      [2, 0],
      [1, 2],
      [0, 0],
    ]),
  },
  {
    region: "B",
    rate: 28,
    geometry: poly([
      [2.2, 0],
      [4.2, 0],
      [3.2, 2],
      [2.2, 0],
    ]),
  },
  {
    region: "C",
    rate: 18,
    geometry: poly([
      [1, 2.2],
      [3.2, 2.2],
      [2.1, 4],
      [1, 2.2],
    ]),
  },
];
