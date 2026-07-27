/**
 * Synthetic bivariate cloud for a 2D bin heatmap demo.
 */
export const cloud: { x: number; y: number }[] = (() => {
  const rows: { x: number; y: number }[] = [];
  // Seeded LCG so the gallery is deterministic.
  let s = 42;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = 0; i < 400; i++) {
    // Two overlapping Gaussians via Box–Muller-ish sampling.
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(u1));
    const th = 2 * Math.PI * u2;
    const g1 = r * Math.cos(th);
    const g2 = r * Math.sin(th);
    if (i < 220) {
      rows.push({ x: 3 + g1 * 0.9, y: 4 + g2 * 1.1 });
    } else {
      rows.push({ x: 7 + g1 * 1.2, y: 6 + g2 * 0.8 });
    }
  }
  return rows;
})();
