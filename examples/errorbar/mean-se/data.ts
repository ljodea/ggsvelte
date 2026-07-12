/** Seeded yields per fertilizer treatment (uneven replicates). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xe5e5);

function noisy(center: number, spread: number): number {
  const u = rnd() + rnd() + rnd();
  return Math.round((center + (u - 1.5) * spread) * 100) / 100;
}

export const yields: { treatment: string; yield_: number }[] = [];
for (const [treatment, center, n] of [
  ["control", 42, 12],
  ["low", 47, 9],
  ["medium", 55, 11],
  ["high", 53, 8],
] as const) {
  for (let i = 0; i < n; i++) yields.push({ treatment, yield_: noisy(center, 7) });
}
