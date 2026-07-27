/**
 * Closed figure-eight polyline in data order.
 *
 * Vertices intentionally revisit x (and cross themselves). geom_line would
 * sort by x and scramble the loops; geom_path keeps row order (#788).
 *
 * Integer coordinates only — no Math.sin / transcendental literals (oxlint
 * approx-constant) and byte-stable seeds across hosts.
 */
export const figureEight: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 0 },
  { x: 2, y: -1 },
  { x: 1, y: -1 },
  { x: 0, y: 0 },
  { x: -1, y: 1 },
  { x: -2, y: 1 },
  { x: -3, y: 0 },
  { x: -2, y: -1 },
  { x: -1, y: -1 },
  { x: 0, y: 0 },
];
