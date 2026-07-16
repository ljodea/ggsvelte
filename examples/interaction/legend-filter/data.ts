export const ridership = [
  { id: "bus-jan", month: 1, riders: 42, mode: "Bus" },
  { id: "bus-feb", month: 2, riders: 45, mode: "Bus" },
  { id: "bus-mar", month: 3, riders: 48, mode: "Bus" },
  { id: "bus-apr", month: 4, riders: 51, mode: "Bus" },
  { id: "rail-jan", month: 1, riders: 58, mode: "Rail" },
  { id: "rail-feb", month: 2, riders: 61, mode: "Rail" },
  { id: "rail-mar", month: 3, riders: 65, mode: "Rail" },
  { id: "rail-apr", month: 4, riders: 69, mode: "Rail" },
  { id: "ferry-jan", month: 1, riders: 25, mode: "Ferry" },
  { id: "ferry-feb", month: 2, riders: 27, mode: "Ferry" },
  { id: "ferry-mar", month: 3, riders: 31, mode: "Ferry" },
  { id: "ferry-apr", month: 4, riders: 34, mode: "Ferry" },
  { id: "cycle-jan", month: 1, riders: 18, mode: "Cycle" },
  { id: "cycle-feb", month: 2, riders: 23, mode: "Cycle" },
  { id: "cycle-mar", month: 3, riders: 29, mode: "Cycle" },
  { id: "cycle-apr", month: 4, riders: 37, mode: "Cycle" },
] as const;

export type RidershipRow = (typeof ridership)[number];
