/**
 * Shared fixtures for the geom_sf pipeline test family.
 * Data and pure helpers only — no bun:test imports, no registered tests.
 */

const size = { width: 400, height: 300 };

function geo(g: object): string {
  return JSON.stringify(g);
}

const polyA = geo({
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [0.5, 1],
      [0, 0],
    ],
  ],
});
const polyB = geo({
  type: "Polygon",
  coordinates: [
    [
      [2, 0],
      [3, 0],
      [2.5, 1],
      [2, 0],
    ],
  ],
});

export { geo, polyA, polyB, size };
