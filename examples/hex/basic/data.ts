import { mulberry32 } from "../../rng.js";

/** Two overlapping clouds for a hex heatmap demo. */
export const cloud: { x: number; y: number }[] = (() => {
  const rows: { x: number; y: number }[] = [];
  const rnd = mulberry32(99);
  for (let i = 0; i < 500; i++) {
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(u1));
    const th = 2 * Math.PI * u2;
    const g1 = r * Math.cos(th);
    const g2 = r * Math.sin(th);
    if (i < 280) rows.push({ x: 2 + g1 * 0.8, y: 3 + g2 * 1.0 });
    else rows.push({ x: 6 + g1 * 1.1, y: 5 + g2 * 0.7 });
  }
  return rows;
})();
