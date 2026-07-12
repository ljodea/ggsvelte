/**
 * One row per streaming session (the bar geom counts rows; position fill
 * turns the counts into proportions). Seeded, byte-reproducible.
 */
import { mulberry32 } from "../../rng.js";

const random = mulberry32(99);
const ages = ["18–24", "25–34", "35–49", "50+"] as const;
const genres = ["drama", "comedy", "documentary"] as const;
// [drama, comedy] cumulative shares per age group; the rest is documentary.
const shares: readonly (readonly [number, number])[] = [
  [0.3, 0.75],
  [0.4, 0.75],
  [0.5, 0.8],
  [0.55, 0.75],
];

export const sessions: { age: string; genre: string }[] = [];
ages.forEach((age, i) => {
  for (let n = 0; n < 40; n += 1) {
    const r = random();
    const genre = r < shares[i]![0] ? genres[0] : r < shares[i]![1] ? genres[1] : genres[2];
    sessions.push({ age, genre });
  }
});
