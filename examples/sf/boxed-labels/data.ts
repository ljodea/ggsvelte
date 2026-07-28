/**
 * John Snow's Soho, split into the thirteen areas closest to each public pump,
 * carried as simple features: one row per neighbourhood, with the pump's
 * street name as the label the map needs.
 *
 * Transcribed from HistData::Snow.polygons and HistData::Snow.pumps (see
 * NOTICE); the same thirteen rings as examples/polygon/regions, encoded one
 * GeoJSON Polygon per row instead of one row per vertex. Coordinates are the
 * arbitrary map units of the 1992 Dodson digitization, already projected.
 */
function poly(coords: readonly (readonly [number, number])[]): string {
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

export const pumpNeighbourhoods: { pump: string; geometry: string }[] = [
  {
    pump: "Oxford Market",
    geometry: poly([
      [3.39, 16.32],
      [10.3, 16.42],
      [9.68, 18.73],
      [3.39, 18.73],
      [3.39, 16.32],
    ]),
  },
  {
    pump: "Castle St E",
    geometry: poly([
      [10.3, 16.42],
      [11.19, 15.85],
      [12.54, 18.73],
      [9.68, 18.73],
      [10.3, 16.42],
    ]),
  },
  {
    pump: "Oxford St #1",
    geometry: poly([
      [11.19, 15.85],
      [11.79, 14.73],
      [15.05, 14.27],
      [13.82, 18.73],
      [12.54, 18.73],
      [11.19, 15.85],
    ]),
  },
  {
    pump: "Oxford St #2",
    geometry: poly([
      [15.05, 14.27],
      [16.56, 13.69],
      [16.84, 13.75],
      [19.91, 15.28],
      [19.91, 18.73],
      [13.82, 18.73],
      [15.05, 14.27],
    ]),
  },
  {
    pump: "Gt Marlborough",
    geometry: poly([
      [3.39, 13.4],
      [11.21, 14.02],
      [11.79, 14.73],
      [11.19, 15.85],
      [10.3, 16.42],
      [3.39, 16.32],
      [3.39, 13.4],
    ]),
  },
  {
    pump: "Crown Chapel",
    geometry: poly([
      [3.39, 8.83],
      [6.17, 8.88],
      [10.16, 10.23],
      [11.21, 14.02],
      [3.39, 13.4],
      [3.39, 8.83],
    ]),
  },
  {
    pump: "Broad St",
    geometry: poly([
      [10.16, 10.23],
      [11.75, 9.52],
      [14.29, 10.16],
      [16.56, 13.69],
      [15.05, 14.27],
      [11.79, 14.73],
      [11.21, 14.02],
      [10.16, 10.23],
    ]),
  },
  {
    pump: "Warwick",
    geometry: poly([
      [12.5, 4.36],
      [12.65, 4.7],
      [11.75, 9.52],
      [10.16, 10.23],
      [6.17, 8.88],
      [12.5, 4.36],
    ]),
  },
  {
    pump: "Briddle St",
    geometry: poly([
      [12.65, 4.7],
      [15.6, 7.21],
      [14.29, 10.16],
      [11.75, 9.52],
      [12.65, 4.7],
    ]),
  },
  {
    pump: "So Soho",
    geometry: poly([
      [15.6, 7.21],
      [18.17, 6.95],
      [16.84, 13.75],
      [16.56, 13.69],
      [14.29, 10.16],
      [15.6, 7.21],
    ]),
  },
  {
    pump: "Dean St",
    geometry: poly([
      [18.17, 6.95],
      [19.91, 5.87],
      [19.91, 15.28],
      [16.84, 13.75],
      [18.17, 6.95],
    ]),
  },
  {
    pump: "Coventry St",
    geometry: poly([
      [12.65, 4.7],
      [12.5, 4.36],
      [12.49, 3.23],
      [19.91, 3.23],
      [19.91, 5.87],
      [18.17, 6.95],
      [15.6, 7.21],
      [12.65, 4.7],
    ]),
  },
  {
    pump: "Vigo St",
    geometry: poly([
      [3.39, 3.23],
      [12.49, 3.23],
      [12.5, 4.36],
      [6.17, 8.88],
      [3.39, 8.83],
      [3.39, 3.23],
    ]),
  },
];
