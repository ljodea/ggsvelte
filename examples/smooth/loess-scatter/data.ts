/** Seeded scatter with a curved trend (rises, then falls). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0x10e55);

export const trend: { dose: number; effect: number }[] = [];
for (let i = 0; i < 80; i++) {
  const dose = Math.round(rnd() * 100 * 10) / 10;
  const noise = (rnd() - 0.5) * 14;
  const effect = Math.round((15 + 1.6 * dose - 0.014 * dose * dose + noise) * 10) / 10;
  trend.push({ dose, effect });
}
