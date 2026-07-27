import { mulberry32 } from "../../rng.js";

/** Sample from a slightly right-skewed distribution for a Q–Q demo. */
export const heights: { height: number }[] = (() => {
  const rows: { height: number }[] = [];
  const rnd = mulberry32(7);
  for (let i = 0; i < 80; i++) {
    // Box–Muller + slight skew
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    rows.push({ height: 170 + z * 8 + Math.max(0, z) * 1.5 });
  }
  return rows;
})();
