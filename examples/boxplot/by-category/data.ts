/** Seeded measurement spreads per instrument, with planted outliers. */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xb0c5);

function noisy(center: number, spread: number): number {
  // Sum of three uniforms: symmetric, light tails.
  const u = rnd() + rnd() + rnd();
  return Math.round((center + (u - 1.5) * spread) * 100) / 100;
}

export const readings: { instrument: string; value: number }[] = [];
for (const [instrument, center, spread] of [
  ["alpha", 40, 8],
  ["beta", 55, 16],
  ["gamma", 47, 5],
] as const) {
  for (let i = 0; i < 40; i++) readings.push({ instrument, value: noisy(center, spread) });
}
// Planted outliers (beyond 1.5 x IQR).
readings.push(
  { instrument: "alpha", value: 78 },
  { instrument: "alpha", value: 5 },
  { instrument: "gamma", value: 71.5 },
);
