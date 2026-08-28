/**
 * Check path — CI-safe staleness/consistency verification. Never writes.
 *
 * The results/*.json source of truth is gitignored (re-run measure:* to
 * produce it), so CI has no benchmark data. When absent, the committed
 * artifacts are verified for internal consistency (projection ⇄ SVGs); when
 * present (local), the full regeneration-compare freshness check runs.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { benchmarkChartDarkSiteSvg } from "../../apps/docs/src/lib/benchmarks/charts";

import { projectionSource } from "./projection";
import { OUTPUT_DIR, PROJECTION, resultsAvailable } from "./results";
import { build } from "./write";

export async function check(): Promise<void> {
  if (!existsSync(OUTPUT_DIR) || !existsSync(PROJECTION)) {
    throw new Error("benchmark charts are MISSING. Run: bun scripts/gen-benchmark-charts.ts");
  }

  if (!resultsAvailable()) {
    checkConsistent();
    console.log("benchmark:charts artifacts are current (results absent — consistency only).");
    return;
  }

  const { files, cards, versions, bundleKb, generatedAt } = build();
  const wantNames = new Set(files.map((f) => f.filename));
  const haveNames = new Set(readdirSync(OUTPUT_DIR).filter((n) => n.endsWith(".svg")));
  for (const name of wantNames) {
    if (!haveNames.has(name)) {
      throw new Error(
        `benchmark charts STALE (missing ${name}). Run: bun scripts/gen-benchmark-charts.ts`,
      );
    }
    const onDisk = readFileSync(join(OUTPUT_DIR, name), "utf8");
    const want = files.find((f) => f.filename === name)!.body;
    if (onDisk !== want) {
      throw new Error(
        `benchmark charts STALE (${name} content). Run: bun scripts/gen-benchmark-charts.ts`,
      );
    }
  }
  for (const name of haveNames) {
    if (!wantNames.has(name)) {
      throw new Error(
        `benchmark charts STALE (orphan ${name}). Run: bun scripts/gen-benchmark-charts.ts`,
      );
    }
  }
  const wantProj = await projectionSource(files, cards, versions, bundleKb, generatedAt);
  const haveProj = readFileSync(PROJECTION, "utf8");
  if (haveProj !== wantProj) {
    throw new Error("benchmark-charts projection STALE. Run: bun scripts/gen-benchmark-charts.ts");
  }
  console.log("benchmark:charts artifacts are current.");
}

/**
 * CI-safe consistency check when benchmark results are absent: the committed
 * projection must reference SVGs that all exist on disk, and each light SVG's
 * on-disk content must match its recorded sha256 (proving artifacts weren't
 * hand-edited). No regeneration — that requires the gitignored results.
 */
function checkConsistent(): void {
  const proj = readFileSync(PROJECTION, "utf8");
  const cardRe =
    /path: "(\/benchmarks\/([^"]+))",\s*darkPath: "(\/benchmarks\/([^"]+))",\s*sha256: "([0-9a-f]{64})"/g;
  let matched = 0;
  const wantNames = new Set<string>();
  for (const m of proj.matchAll(cardRe)) {
    matched += 1;
    const lightName = m[2]!;
    const darkName = m[4]!;
    const wantSha = m[5]!;
    wantNames.add(lightName);
    wantNames.add(darkName);
    for (const name of [lightName, darkName]) {
      if (!existsSync(join(OUTPUT_DIR, name))) {
        throw new Error(
          `benchmark charts INCONSISTENT (projection references missing ${name}). Run: bun scripts/gen-benchmark-charts.ts`,
        );
      }
    }
    const lightBody = readFileSync(join(OUTPUT_DIR, lightName), "utf8");
    const onDiskSha = createHash("sha256").update(lightBody).digest("hex");
    if (onDiskSha !== wantSha) {
      throw new Error(
        `benchmark charts INCONSISTENT (${lightName} sha mismatch vs projection). Run: bun scripts/gen-benchmark-charts.ts`,
      );
    }
    // The dark-site SVG is a deterministic transform of the light one — recompute
    // it and compare byte-for-byte so a stale/hand-edited dark image can't pass.
    const wantDark = benchmarkChartDarkSiteSvg(lightBody);
    const onDiskDark = readFileSync(join(OUTPUT_DIR, darkName), "utf8");
    if (onDiskDark !== wantDark) {
      throw new Error(
        `benchmark charts INCONSISTENT (${darkName} does not match the dark-site transform of ${lightName}). Run: bun scripts/gen-benchmark-charts.ts`,
      );
    }
  }
  if (matched === 0) {
    throw new Error("benchmark-charts projection has no parseable cards; cannot verify.");
  }
  // Parity with the full check path: orphan SVGs left after a rename/drop fail
  // CI even when results are absent (the usual CI case).
  if (existsSync(OUTPUT_DIR)) {
    for (const name of readdirSync(OUTPUT_DIR).filter((n) => n.endsWith(".svg"))) {
      if (!wantNames.has(name)) {
        throw new Error(
          `benchmark charts INCONSISTENT (orphan ${name}). Run: bun scripts/gen-benchmark-charts.ts`,
        );
      }
    }
  }
}
