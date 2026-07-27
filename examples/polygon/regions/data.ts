/**
 * Two simple polygonal regions (synthetic choropleth-style shapes) for
 * geom_polygon demo. Vertices are listed in winding order per region id.
 */
export const regions: { x: number; y: number; region: string }[] = [
  // West triangle
  { x: 0, y: 0, region: "West" },
  { x: 2, y: 0, region: "West" },
  { x: 1, y: 2, region: "West" },
  // East pentagon-ish block
  { x: 2.2, y: 0, region: "East" },
  { x: 4, y: 0, region: "East" },
  { x: 4, y: 1.5, region: "East" },
  { x: 3, y: 2.2, region: "East" },
  { x: 2.2, y: 1.2, region: "East" },
];
