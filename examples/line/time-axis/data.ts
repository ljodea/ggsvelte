/**
 * A deterministic long-run index. Years intentionally remain raw four-digit
 * strings: ggsvelte infers their calendar meaning without preprocessing.
 */
import { mulberry32 } from "../../rng.js";

const random = mulberry32(1835);

export const longRunSeries: { year: string; value: number }[] = [];
let level = 40;
for (let year = 1835; year <= 2025; year += 5) {
  level += 1.4 + (random() - 0.45) * 5;
  longRunSeries.push({ year: String(year), value: Math.round(level * 10) / 10 });
}
