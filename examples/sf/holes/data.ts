/**
 * Already-projected polygons with interior rings (holes) for geom_sf even-odd
 * fill (#809 phase 4). Portable CellValue GeoJSON Geometry JSON strings.
 */
function polyWithHole(exterior: [number, number][], hole: [number, number][]): string {
  return JSON.stringify({ type: "Polygon", coordinates: [exterior, hole] });
}

export const donuts: { geometry: string; region: string; rate: number }[] = [
  {
    region: "A",
    rate: 22,
    geometry: polyWithHole(
      [
        [0, 0],
        [6, 0],
        [6, 6],
        [0, 6],
        [0, 0],
      ],
      [
        [2, 2],
        [4, 2],
        [4, 4],
        [2, 4],
        [2, 2],
      ],
    ),
  },
  {
    region: "B",
    rate: 38,
    geometry: polyWithHole(
      [
        [7, 0],
        [12, 0],
        [12, 5],
        [7, 5],
        [7, 0],
      ],
      [
        [8.5, 1.5],
        [10.5, 1.5],
        [10.5, 3.5],
        [8.5, 3.5],
        [8.5, 1.5],
      ],
    ),
  },
];
