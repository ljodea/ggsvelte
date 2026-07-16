export const rows = [
  { id: "a1", group: "A", x: 1, y: 4.2 },
  { id: "a2", group: "A", x: 2, y: 5.1 },
  { id: "a3", group: "A", x: 3, y: 4.7 },
  { id: "b1", group: "B", x: 1, y: 2.2 },
  { id: "b2", group: "B", x: 2, y: 3.1 },
  { id: "b3", group: "B", x: 3, y: 2.6 },
  { id: "c1", group: "C", x: 1, y: 6.1 },
  { id: "c2", group: "C", x: 2, y: 6.8 },
  { id: "c3", group: "C", x: 3, y: 6.4 },
] as const;

export type LegendFocusRow = (typeof rows)[number];
