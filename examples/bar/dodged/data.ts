/**
 * One row per conference attendee (the bar geom counts rows per track and
 * experience level). Seeded so the corpus is byte-reproducible.
 */
import { mulberry32 } from "../../rng.js";

const random = mulberry32(7);
const tracks = ["Frontend", "Backend", "Data", "DevOps"] as const;
const levels = ["junior", "mid", "senior"] as const;
// [junior, mid] cumulative shares per track; the rest is senior.
const shares: readonly (readonly [number, number])[] = [
  [0.45, 0.8],
  [0.3, 0.65],
  [0.25, 0.6],
  [0.2, 0.55],
];
const volume = [42, 38, 30, 24];

export const attendees: { track: string; level: string }[] = [];
tracks.forEach((track, i) => {
  for (let n = 0; n < volume[i]!; n += 1) {
    const r = random();
    const level = r < shares[i]![0] ? levels[0] : r < shares[i]![1] ? levels[1] : levels[2];
    attendees.push({ track, level });
  }
});
