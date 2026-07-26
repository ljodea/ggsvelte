/**
 * Direction field for geom_spoke (#810): origins with angle (radians) + radius.
 */
export const wind: { x: number; y: number; theta: number; r: number; station: string }[] = [
  { x: 0, y: 0, theta: 0, r: 1.2, station: "A" },
  { x: 1, y: 0.5, theta: Math.PI / 4, r: 1.5, station: "B" },
  { x: 2, y: 0.2, theta: Math.PI / 2, r: 1.0, station: "C" },
  { x: 0.5, y: 1.2, theta: (3 * Math.PI) / 4, r: 1.3, station: "D" },
  { x: 1.5, y: 1.5, theta: Math.PI, r: 0.9, station: "E" },
  { x: 2.5, y: 1.0, theta: (5 * Math.PI) / 4, r: 1.1, station: "F" },
];
