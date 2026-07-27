/**
 * One GeometryCollection of two already-projected triangle polygons.
 * Portable CellValue encoding for geom_sf GC expand (#809 phase 6).
 */
function poly(coords: [number, number][]): object {
  return { type: "Polygon", coordinates: [coords] };
}

const polyA = poly([
  [0, 0],
  [2, 0],
  [1, 2],
  [0, 0],
]);
const polyB = poly([
  [2.2, 0],
  [4.2, 0],
  [3.2, 2],
  [2.2, 0],
]);

export const collectionRegions: {
  geometry: string;
  region: string;
  rate: number;
}[] = [
  {
    region: "A+B",
    rate: 22,
    geometry: JSON.stringify({
      type: "GeometryCollection",
      geometries: [polyA, polyB],
    }),
  },
];
