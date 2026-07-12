/** 10,000 seeded points in two gaussian-ish clusters (canvas showcase). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xca57);

/** Box-Muller-free normal-ish: mean of 4 uniforms, recentred. */
function noise(): number {
  return (rnd() + rnd() + rnd() + rnd()) / 2 - 1;
}

export const cloud: { x: number; y: number; cluster: string }[] = [];
for (let i = 0; i < 10_000; i++) {
  const second = rnd() < 0.45;
  cloud.push({
    x: Math.round(((second ? 6.2 : 3.1) + noise() * 1.6) * 1000) / 1000,
    y: Math.round(((second ? 2.4 : 4.8) + noise() * 1.3) * 1000) / 1000,
    cluster: second ? "b" : "a",
  });
}
