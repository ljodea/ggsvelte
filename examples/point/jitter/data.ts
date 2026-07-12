/** Seeded discrete ratings: heavy overplotting without jitter. */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0x717e);

export const ratings: { team: string; score: number }[] = [];
for (const team of ["north", "east", "south", "west"]) {
  for (let i = 0; i < 60; i++) {
    // Integer scores 1..7 - identical values pile up exactly.
    const score = 1 + Math.floor(rnd() * 7);
    ratings.push({ team, score });
  }
}
