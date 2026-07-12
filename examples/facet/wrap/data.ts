/** Seeded response-time samples for three services (facet panels). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0xfa11);

export const samples: { ms: number; service: string }[] = [];
const centers: Record<string, number> = { api: 140, web: 210, batch: 320 };
for (const service of ["api", "web", "batch"]) {
  for (let i = 0; i < 90; i++) {
    let sum = 0;
    for (let k = 0; k < 6; k++) sum += rnd();
    samples.push({
      ms: Math.round((centers[service]! * 0.6 + sum * centers[service]! * 0.13) * 10) / 10,
      service,
    });
  }
}
