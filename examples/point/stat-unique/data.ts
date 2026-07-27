/**
 * Synthetic overplotted grid: each (x, y, series) combination is repeated
 * three times so identity would draw stacked marks; stat unique keeps the
 * first row per aesthetic combination (#813).
 *
 * Integer grid only — no RNG, byte-stable for gallery previews and seeds.
 */
export const overplottedGrid: { x: number; y: number; series: string }[] = (() => {
  const rows: { x: number; y: number; series: string }[] = [];
  for (const series of ["A", "B"] as const) {
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 3; y++) {
        // Three identical aesthetic rows — unique collapses them to one mark.
        for (let rep = 0; rep < 3; rep++) {
          rows.push({ x, y: y + (series === "B" ? 0.15 : 0), series });
        }
      }
    }
  }
  return rows;
})();
