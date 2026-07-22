/** Ordered regional metrics for side-strip small multiples (issue #590). */
import { mulberry32 } from "../../rng.js";

const rnd = mulberry32(0x590);

/** Closed semantic order: west → midwest → south → northeast. */
export const REGIONS = ["west", "midwest", "south", "northeast"] as const;

export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  west: "West",
  midwest: "Midwest",
  south: "South",
  northeast: "Northeast",
};

const bases: Record<Region, number> = {
  west: 42,
  midwest: 55,
  south: 48,
  northeast: 61,
};

export const samples: { quarter: number; score: number; region: Region }[] = [];
for (const region of REGIONS) {
  for (let quarter = 1; quarter <= 4; quarter++) {
    samples.push({
      quarter,
      score: Math.round((bases[region] + quarter * 2.5 + rnd() * 6) * 10) / 10,
      region,
    });
  }
}
