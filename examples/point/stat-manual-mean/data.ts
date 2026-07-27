/**
 * Synthetic two-group scatter for stat_manual mean (#814): each series has
 * four (x, y) rows so identity would draw four marks per colour; manual mean
 * collapses each group to one centroid. Integer-ish values only — byte-stable
 * for gallery previews and seeds.
 */
export const groupScatter: { x: number; y: number; series: string }[] = [
  // Series A — centroid near (2, 3)
  { x: 1, y: 2, series: "A" },
  { x: 2, y: 3, series: "A" },
  { x: 3, y: 4, series: "A" },
  { x: 2, y: 3, series: "A" },
  // Series B — centroid near (5, 2)
  { x: 4, y: 1, series: "B" },
  { x: 5, y: 2, series: "B" },
  { x: 6, y: 3, series: "B" },
  { x: 5, y: 2, series: "B" },
];
