/**
 * JSON emission mode (M3 budgets): runs every FULL-SIZE workload from
 * workloads.ts a bounded number of iterations and writes the medians to
 * `bench-results.json` at the REPO ROOT in github-action-benchmark
 * customSmallerIsBetter format:
 *
 *   [{ "name": "<workload id>", "unit": "ms", "value": <median ms> }]
 *
 * Deliberately mitata-free: warmup then a fixed measure loop with
 * performance.now() medians — deterministic-ish and cheap enough for CI.
 * `check-budgets.ts` gates the output against budgets.json.
 *
 * Canvas workloads run against a stub 2d context (bun has no raster), so
 * they measure JS COMMAND-GENERATION cost only — see workloads.ts.
 *
 * bench-results.json is a build artifact: it must stay gitignored, never
 * committed.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildWorkloads } from "./workloads";

const WARMUP_RUNS = 3;
const MIN_MEASURE_RUNS = 10;
const MEASURE_CAP_MS = 2_000;

/** Median of a non-empty sample list. */
function median(samples: number[]): number {
  const sorted = samples.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

interface BenchResult {
  name: string;
  unit: "ms";
  value: number;
}

// Always full-size workloads: budget ids must be stable (never smoke sizes).
const workloads = buildWorkloads(false);
const results: BenchResult[] = [];

for (const workload of workloads) {
  for (let i = 0; i < WARMUP_RUNS; i++) workload.fn();

  // Measure until MIN_MEASURE_RUNS or the time cap, whichever comes FIRST
  // (slow workloads stop early on the cap; at least one sample always).
  const samples: number[] = [];
  const measureStart = performance.now();
  do {
    const t0 = performance.now();
    workload.fn();
    samples.push(performance.now() - t0);
  } while (samples.length < MIN_MEASURE_RUNS && performance.now() - measureStart < MEASURE_CAP_MS);

  const value = Number(median(samples).toFixed(4));
  results.push({ name: workload.id, unit: "ms", value });
  console.log(`${workload.id}: ${value} ms (median of ${samples.length} runs)`);
}

// Repo root, one level above benchmarks/.
const outPath = fileURLToPath(new URL("../bench-results.json", import.meta.url));
writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(`\nwrote ${results.length} results to ${outPath}`);
