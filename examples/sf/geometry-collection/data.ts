/**
 * The two pieces of Maunga Whau that stand above 180 metres: the summit ridge
 * around the crater, and a smaller rise to the east of it. They are one record
 * about one hill, so they travel as one feature - which is what a
 * GeometryCollection is for.
 *
 * Rings traced by marching squares over R's `datasets::volcano` (see NOTICE),
 * read at every second grid line - 20 m spacing, the same survey as
 * examples/contour/basic. Coordinates are metres from the south-west corner.
 *
 * R's own note applies: these heights should not be regarded as accurate.
 */
type Ring = readonly (readonly [number, number])[];

function poly(coords: Ring): object {
  return { type: "Polygon", coordinates: [coords] };
}

const SUMMIT: Ring = [
  [140.0, 299.4],
  [139.8, 300.0],
  [134.5, 320.0],
  [134.5, 340.0],
  [139.8, 360.0],
  [140.0, 360.6],
  [152.0, 380.0],
  [160.0, 385.7],
  [171.1, 400.0],
  [180.0, 411.4],
  [188.6, 420.0],
  [200.0, 431.4],
  [215.0, 440.0],
  [220.0, 444.0],
  [240.0, 441.8],
  [258.2, 460.0],
  [260.0, 460.4],
  [260.9, 460.0],
  [280.0, 440.9],
  [300.0, 440.5],
  [300.5, 440.0],
  [300.0, 438.2],
  [281.8, 420.0],
  [280.0, 419.7],
  [279.1, 420.0],
  [260.0, 433.3],
  [240.9, 420.0],
  [240.0, 419.5],
  [226.7, 400.0],
  [220.0, 386.7],
  [218.2, 380.0],
  [214.7, 360.0],
  [212.5, 340.0],
  [211.4, 320.0],
  [214.3, 300.0],
  [220.0, 288.6],
  [226.7, 280.0],
  [240.0, 260.3],
  [240.4, 260.0],
  [260.0, 240.4],
  [280.0, 240.2],
  [281.8, 240.0],
  [280.9, 220.0],
  [280.0, 219.4],
  [260.6, 200.0],
  [260.0, 199.7],
  [240.0, 196.7],
  [220.0, 197.5],
  [215.0, 200.0],
  [200.0, 206.7],
  [180.0, 216.7],
  [173.3, 220.0],
  [160.0, 230.0],
  [156.0, 240.0],
  [152.0, 260.0],
  [147.5, 280.0],
  [140.0, 299.4],
];

const EASTERN_RISE: Ring = [
  [360.0, 259.1],
  [359.1, 260.0],
  [360.0, 261.8],
  [378.2, 280.0],
  [380.0, 280.9],
  [380.3, 280.0],
  [380.4, 260.0],
  [380.0, 259.5],
  [360.0, 259.1],
];

export const aboveOneEighty: { geometry: string; ground: string }[] = [
  {
    ground: "Above 180 m",
    geometry: JSON.stringify({
      type: "GeometryCollection",
      geometries: [poly(SUMMIT), poly(EASTERN_RISE)],
    }),
  },
];
