import { mkdirSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import supportMatrix from "../support-matrix.json";
import type { PackageManager } from "./support-matrix.js";

export interface QuickstartTimingTrial {
  packageManager: PackageManager;
  durationMs: number;
  success: boolean;
  node: string;
  packageManagerVersion: string;
  svelte: string;
  os: string;
}

export interface QuickstartTimingReport {
  schemaVersion: 1;
  disclosure: string;
  boundaries: string;
  trials: readonly QuickstartTimingTrial[];
  generatedAt?: string;
}

export function summarizeQuickstartTrials(trials: readonly QuickstartTimingTrial[]): {
  p50Ms: number;
  p90Ms: number;
  passesReleaseTarget: boolean;
} {
  if (trials.length === 0) throw new Error("cannot summarize an empty timing report");
  const durations = trials.map((trial) => trial.durationMs).toSorted((a, b) => a - b);
  const nearestRank = (percentile: number): number =>
    durations[Math.max(0, Math.ceil(percentile * durations.length) - 1)]!;
  const p50Ms = nearestRank(0.5);
  const p90Ms = nearestRank(0.9);
  return { p50Ms, p90Ms, passesReleaseTarget: p50Ms <= 210_000 && p90Ms < 300_000 };
}

export function validateQuickstartTimingReport(report: QuickstartTimingReport): string[] {
  const errors: string[] = [];
  if (!/automated/i.test(report.disclosure) || !/not.*human.*tthw/i.test(report.disclosure)) {
    errors.push("disclosure must say this is automated and not observed human TTHW");
  }
  if (report.trials.length !== 5) errors.push("expected exactly five trials");
  for (const [packageManager, expected] of [
    ["npm", 2],
    ["pnpm", 2],
    ["bun", 1],
  ] as const) {
    const actual = report.trials.filter((trial) => trial.packageManager === packageManager).length;
    if (actual !== expected) {
      const label = packageManager === "bun" ? "Bun" : packageManager;
      errors.push(`expected ${label} ×${String(expected)}, got ${String(actual)}`);
    }
  }
  if (report.trials.some((trial) => !trial.success))
    errors.push("every recorded trial must succeed");
  if (
    report.trials.some(
      (trial) =>
        trial.durationMs <= 0 ||
        trial.node === "" ||
        trial.packageManagerVersion === "" ||
        trial.svelte === "" ||
        trial.os === "",
    )
  ) {
    errors.push("every trial must preserve positive duration and toolchain evidence");
  }
  return errors;
}

function packageManagerVersion(packageManager: PackageManager, root: string): string {
  // The harness itself verifies the pinned pnpm CLI before timing. Invoking
  // pnpm at the Bun-owned repository root intentionally exits nonzero because
  // packageManager declares Bun, so preserve the verified pin here.
  if (packageManager === "pnpm") return supportMatrix.packageManagers.pnpm;
  const result = spawnSync(packageManager, ["--version"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`could not resolve ${packageManager} version`);
  return result.stdout.trim();
}

function runTrial(packageManager: PackageManager, root: string): QuickstartTimingTrial {
  const started = performance.now();
  const result = spawnSync(
    "bun",
    [resolve("scripts", "consumer-compat.ts"), packageManager, supportMatrix.svelte.current],
    { cwd: root, stdio: "inherit", shell: false },
  );
  const durationMs = Math.round(performance.now() - started);
  return {
    packageManager,
    durationMs,
    success: result.status === 0,
    node: process.version,
    packageManagerVersion: packageManagerVersion(packageManager, root),
    svelte: supportMatrix.svelte.current,
    os: platform(),
  };
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function main(): void {
  const root = resolve(import.meta.dir, "..");
  const packageManagers: PackageManager[] = ["npm", "npm", "pnpm", "pnpm", "bun"];
  const trials = packageManagers.map((packageManager) => runTrial(packageManager, root));
  const report: QuickstartTimingReport = {
    schemaVersion: 1,
    disclosure: "Automated clean-room rehearsal; not observed human TTHW.",
    boundaries:
      "npm pack through clean install, SvelteKit strict check/build/prerender verification, core smoke, and installed CLI checks",
    generatedAt: new Date().toISOString(),
    trials,
  };
  const errors = validateQuickstartTimingReport(report);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const summary = summarizeQuickstartTrials(trials);
  const output = join(root, "artifacts", "quickstart", "timing.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify({ ...report, summary }, null, 2)}\n`);
  writeFileSync(
    join(root, "artifacts", "quickstart", "README.md"),
    `# Quickstart timing evidence\n\nThis is an **automated clean-room rehearsal**, not observed human TTHW. Each trial starts before packing release-shaped packages and ends after a clean SvelteKit install, strict check, production prerender, SSR assertions, pure-core smoke, and installed CLI checks. Network and machine load make these durations informational.\n\n- p50: ${formatDuration(summary.p50Ms)}\n- p90: ${formatDuration(summary.p90Ms)}\n- release target: ${summary.passesReleaseTarget ? "met" : "missed"} (p50 ≤ 3:30; p90 < 5:00)\n\nRaw toolchain and duration rows are in [timing.json](./timing.json).\n`,
  );
  console.log(
    `quickstart timing: p50 ${formatDuration(summary.p50Ms)}, p90 ${formatDuration(summary.p90Ms)}`,
  );
}

if (import.meta.main) main();
