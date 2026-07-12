/** Seeded approximately-normal response times (sum of uniforms), in ms. */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0x4157);

export const responses: { ms: number }[] = [];
for (let i = 0; i < 300; i++) {
  // Irwin-Hall(6) recentred: a smooth, bell-ish shape around 220 ms.
  let sum = 0;
  for (let k = 0; k < 6; k++) sum += rnd();
  responses.push({ ms: Math.round((120 + sum * 60) * 10) / 10 });
}
