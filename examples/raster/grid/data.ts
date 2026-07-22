/** Regular 8×6 density surface (deterministic). */
function densityAt(x: number, y: number): number {
  const a = Math.exp(-((x - 3) ** 2 + (y - 2) ** 2) / 4);
  const b = 0.6 * Math.exp(-((x - 6) ** 2 + (y - 4) ** 2) / 3);
  return a + b;
}

export const grid = (() => {
  const rows: { x: number; y: number; z: number }[] = [];
  for (let yi = 0; yi < 6; yi++) {
    for (let xi = 0; xi < 8; xi++) {
      rows.push({ x: xi, y: yi, z: densityAt(xi, yi) });
    }
  }
  return rows;
})();
