/**
 * Synthetic scatter with fanning residual spread so quantile lines at 0.25 /
 * 0.5 / 0.75 separate visibly (seeded; no Math.random).
 */
import { mulberry32 } from "../../rng.js";

function normal(rng: () => number): number {
  // Box–Muller
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const rng = mulberry32(805);
export const fanningScatter: { x: number; y: number }[] = Array.from({ length: 80 }, () => {
  const x = rng() * 10;
  const y = 1 + 0.8 * x + normal(rng) * (0.4 + 0.25 * x);
  return { x, y };
});
