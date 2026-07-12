/**
 * mitata benchmarks: runPipeline + renderToSVGString at 1k / 10k / 100k
 * points (plan: "Benchmarks — instrumented from the walking skeleton";
 * M3 wires the same workloads into budgets via bench-json.ts +
 * check-budgets.ts).
 *
 * - `bun run bench` — full suite.
 * - `bun run bench:smoke` (BENCH_SMOKE=1) — 1k only; the CI bench-smoke job.
 *
 * Workload definitions live in workloads.ts (ONE source shared by the full
 * suite, the smoke suite, and the JSON/budget mode). Data is generated from
 * a seeded PRNG so runs are comparable.
 */
import { bench, group, run } from "mitata";

import type { Workload } from "./workloads";
import { buildWorkloads } from "./workloads";

const smoke = Boolean(process.env["BENCH_SMOKE"]);

// Group workloads by their mitata group label, preserving table order.
const byGroup = new Map<string, Workload[]>();
for (const workload of buildWorkloads(smoke)) {
  const members = byGroup.get(workload.group);
  if (members === undefined) byGroup.set(workload.group, [workload]);
  else members.push(workload);
}

for (const [label, members] of byGroup) {
  group(label, () => {
    for (const workload of members) bench(workload.bench, workload.fn);
  });
}

await run();
