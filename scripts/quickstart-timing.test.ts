import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { summarizeQuickstartTrials, validateQuickstartTimingReport } from "./quickstart-timing.js";

const report = {
  schemaVersion: 1,
  disclosure: "Automated clean-room rehearsal; not observed human TTHW.",
  boundaries:
    "npm pack through clean install, SvelteKit strict check/build/prerender verification, core smoke, and installed CLI checks",
  trials: [
    {
      packageManager: "npm",
      durationMs: 80_000,
      success: true,
      node: "v22.1.0",
      packageManagerVersion: "10.8.0",
      svelte: "5.56.5",
      os: "linux",
    },
    {
      packageManager: "npm",
      durationMs: 100_000,
      success: true,
      node: "v22.1.0",
      packageManagerVersion: "10.8.0",
      svelte: "5.56.5",
      os: "linux",
    },
    {
      packageManager: "pnpm",
      durationMs: 120_000,
      success: true,
      node: "v24.1.0",
      packageManagerVersion: "11.13.0",
      svelte: "5.56.5",
      os: "linux",
    },
    {
      packageManager: "pnpm",
      durationMs: 140_000,
      success: true,
      node: "v24.1.0",
      packageManagerVersion: "11.13.0",
      svelte: "5.56.5",
      os: "linux",
    },
    {
      packageManager: "bun",
      durationMs: 160_000,
      success: true,
      node: "v24.1.0",
      packageManagerVersion: "1.3.14",
      svelte: "5.56.5",
      os: "linux",
    },
  ],
} as const;

describe("Quickstart automated timing evidence", () => {
  it("recomputes p50/p90 from the required npm×2, pnpm×2, Bun×1 raw trials", () => {
    expect(validateQuickstartTimingReport(report)).toEqual([]);
    expect(summarizeQuickstartTrials(report.trials)).toEqual({
      p50Ms: 120_000,
      p90Ms: 160_000,
      passesReleaseTarget: true,
    });
  });

  it("keeps the checked raw rehearsal report valid and its summary derived", () => {
    const checked = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "artifacts", "quickstart", "timing.json"), "utf8"),
    ) as typeof report & { summary: ReturnType<typeof summarizeQuickstartTrials> };
    expect(validateQuickstartTimingReport(checked)).toEqual([]);
    expect(checked.summary).toEqual(summarizeQuickstartTrials(checked.trials));
  });

  it("rejects summaries without honest disclosure, successful rows, or the trial matrix", () => {
    expect(
      validateQuickstartTimingReport({
        ...report,
        disclosure: "TTHW",
        trials: report.trials.slice(0, 4),
      }),
    ).toEqual([
      "disclosure must say this is automated and not observed human TTHW",
      "expected exactly five trials",
      "expected Bun ×1, got 0",
    ]);
  });
});
