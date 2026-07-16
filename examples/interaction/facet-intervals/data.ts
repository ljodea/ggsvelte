export const observations = [
  { id: "north-1", region: "North", x: 1, y: 4.1 },
  { id: "north-2", region: "North", x: 2, y: 5.4 },
  { id: "north-3", region: "North", x: 3, y: 6.0 },
  { id: "north-4", region: "North", x: 4, y: 7.2 },
  { id: "south-1", region: "South", x: 1, y: 7.4 },
  { id: "south-2", region: "South", x: 2, y: 6.7 },
  { id: "south-3", region: "South", x: 3, y: 5.3 },
  { id: "south-4", region: "South", x: 4, y: 4.8 },
  { id: "east-1", region: "East", x: 1, y: 3.3 },
  { id: "east-2", region: "East", x: 2, y: 4.8 },
  { id: "east-3", region: "East", x: 3, y: 4.2 },
  { id: "east-4", region: "East", x: 4, y: 6.5 },
] as const;

export type Observation = (typeof observations)[number];
