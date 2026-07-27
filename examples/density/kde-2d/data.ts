/**
 * Compact bivariate scatter with two clusters so density_2d isolines nest
 * visibly. Fixed decimals only — playground seeds must be host-stable.
 */
export const twinClouds: { x: number; y: number }[] = [
  // cluster A (lower-left)
  { x: 1.0, y: 1.1 },
  { x: 1.2, y: 0.9 },
  { x: 0.8, y: 1.3 },
  { x: 1.4, y: 1.2 },
  { x: 0.9, y: 0.8 },
  { x: 1.1, y: 1.4 },
  { x: 1.3, y: 1.0 },
  { x: 0.7, y: 1.0 },
  { x: 1.5, y: 0.9 },
  { x: 1.0, y: 0.7 },
  { x: 1.2, y: 1.5 },
  { x: 0.85, y: 1.15 },
  // cluster B (upper-right)
  { x: 4.0, y: 4.1 },
  { x: 4.2, y: 3.9 },
  { x: 3.8, y: 4.3 },
  { x: 4.4, y: 4.2 },
  { x: 3.9, y: 3.8 },
  { x: 4.1, y: 4.4 },
  { x: 4.3, y: 4.0 },
  { x: 3.7, y: 4.0 },
  { x: 4.5, y: 3.9 },
  { x: 4.0, y: 3.7 },
  { x: 4.2, y: 4.5 },
  { x: 3.85, y: 4.15 },
  // bridge noise
  { x: 2.5, y: 2.4 },
  { x: 2.7, y: 2.8 },
  { x: 2.3, y: 2.6 },
  { x: 2.6, y: 2.2 },
];
