/** Seeded monthly series at very different magnitudes (free_y showcase). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xf4ee);

export const metrics: { month: number; value: number; metric: string }[] = [];
const scales: Record<string, number> = { signups: 90, "page views": 42000, errors: 7 };
for (const metric of ["signups", "page views", "errors"]) {
  const base = scales[metric]!;
  let level = base;
  for (let month = 1; month <= 12; month++) {
    level += (rnd() - 0.42) * base * 0.18;
    metrics.push({ month, value: Math.round(Math.max(base * 0.3, level) * 10) / 10, metric });
  }
}
