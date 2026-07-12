/** Seeded durations for two overlapping cohorts. */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xde51);

function noisy(center: number, spread: number): number {
  const u = rnd() + rnd() + rnd() + rnd();
  return Math.round((center + (u - 2) * spread) * 100) / 100;
}

export const sessions: { cohort: string; minutes: number }[] = [];
for (let i = 0; i < 120; i++) sessions.push({ cohort: "mobile", minutes: noisy(9, 4) });
for (let i = 0; i < 120; i++) sessions.push({ cohort: "desktop", minutes: noisy(16, 6) });
