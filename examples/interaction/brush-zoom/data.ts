/** Seeded scatter with a dense center (brush-to-zoom showcase). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xb245);

export const field: { x: number; y: number; group: string }[] = [];
for (let i = 0; i < 240; i++) {
  const tight = i % 3 !== 0;
  const spread = tight ? 1.1 : 4.5;
  field.push({
    x: Math.round((5 + (rnd() - 0.5) * spread * 2) * 1000) / 1000,
    y: Math.round((5 + (rnd() - 0.5) * spread * 2) * 1000) / 1000,
    group: tight ? "core" : "halo",
  });
}
