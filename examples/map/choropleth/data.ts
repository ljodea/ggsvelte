/**
 * Toy fortified map + regional rates for geom_map (#808).
 * Three triangular "regions" in long/lat with a simple value table.
 */
export const fortifiedMap: {
  long: number;
  lat: number;
  region: string;
}[] = [
  // West
  { long: 0, lat: 0, region: "West" },
  { long: 1, lat: 0, region: "West" },
  { long: 0.5, lat: 1.2, region: "West" },
  // East
  { long: 1.2, lat: 0, region: "East" },
  { long: 2.2, lat: 0, region: "East" },
  { long: 1.7, lat: 1.1, region: "East" },
  // North
  { long: 0.4, lat: 1.3, region: "North" },
  { long: 1.8, lat: 1.3, region: "North" },
  { long: 1.1, lat: 2.2, region: "North" },
];

export const regionRates: { region: string; rate: number }[] = [
  { region: "West", rate: 12 },
  { region: "East", rate: 28 },
  { region: "North", rate: 19 },
];
