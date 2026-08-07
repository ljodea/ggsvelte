/**
 * Keep the "Why ggsvelte?" comparison tables on the released package version.
 *
 * Source of truth: packages/svelte/package.json (lockstep with all @ggsvelte/*).
 * Consumers:
 *   - README.md API-stability cell (GitHub front door)
 *   - apps/docs/.../benchmark-charts.ts BENCHMARK_VERSIONS.ggsvelte (docs homepage)
 *
 * Changesets' Version Packages PR runs this after `changeset version` so the
 * bump lands in the same commit as the package.json versions. CI
 * (`comparison:versions:check`, also chained from `bun run check`) fails when
 * the tables drift.
 *
 * Usage:
 *   bun scripts/sync-comparison-versions.ts           # rewrite if needed
 *   bun scripts/sync-comparison-versions.ts --check   # exit 1 if stale
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

const SEMVER = /^\d+\.\d+\.\d+$/;

/** API-stability row: ggsvelte cell is the first version cell after the label. */
const README_API_STABILITY_ROW = /^(\|\s*\*\*API stability\*\*\s*\|)\s*⚠️ v[\d.]+(\s*\|)/m;

/** Projection field written by gen-benchmark-charts.ts. */
const PROJECTION_GGSVELTE = /(ggsvelte:\s*")[^"]+(")/;

export function assertSemver(version: string): void {
  if (!SEMVER.test(version)) {
    throw new Error(`expected a package semver (x.y.z), got ${JSON.stringify(version)}`);
  }
}

/** Lockstep published version — packages/svelte is the comparison-table package. */
export function readLockstepVersion(root: string = ROOT): string {
  const manifest = JSON.parse(readFileSync(join(root, "packages/svelte/package.json"), "utf8")) as {
    version?: string;
  };
  const version = manifest.version;
  if (typeof version !== "string" || !SEMVER.test(version)) {
    throw new Error(
      `packages/svelte/package.json has no valid version field (got ${JSON.stringify(version)})`,
    );
  }
  return version;
}

/**
 * Rewrite the README "API stability" ggsvelte cell to `⚠️ v{version}`.
 * Peer cells (SveltePlot / LayerCake) are left alone.
 *
 * Does not re-pad the markdown table: a version string of a different width
 * can leave the column uneven until `prettierFormatMarkdown` runs (write path).
 */
export function syncReadmeApiStability(markdown: string, version: string): string {
  assertSemver(version);
  if (!README_API_STABILITY_ROW.test(markdown)) {
    throw new Error(
      "README.md is missing a recognizable **API stability** row with a ggsvelte ⚠️ v… cell. " +
        "Restore the comparison table or update the sync pattern.",
    );
  }
  return markdown.replace(README_API_STABILITY_ROW, `$1 ⚠️ v${version}$2`);
}

/** Rewrite only BENCHMARK_VERSIONS.ggsvelte in the generated projection source. */
export function syncBenchmarkGgsvelteVersion(source: string, version: string): string {
  assertSemver(version);
  if (!PROJECTION_GGSVELTE.test(source)) {
    throw new Error(
      "benchmark-charts projection is missing BENCHMARK_VERSIONS.ggsvelte. " +
        "Run: bun scripts/gen-benchmark-charts.ts (or restore the field).",
    );
  }
  return source.replace(PROJECTION_GGSVELTE, `$1${version}$2`);
}

/**
 * Prettier owns markdown table column padding in this repo. After a version
 * rewrite changes cell width, re-run prettier so the Version Packages PR
 * does not fail fmt:check / the pre-commit prettier hook.
 */
export function prettierFormatMarkdown(filePath: string, root: string = ROOT): void {
  // Same invocation shape as package.json `fmt` (bun drives the prettier bin).
  const result = spawnSync(
    "bun",
    ["node_modules/.bin/prettier", "--write", "--log-level", "warn", filePath],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(
      `prettier failed on ${filePath} (status ${String(result.status)})${detail ? `: ${detail}` : ""}`,
    );
  }
}

export type SyncResult = {
  readonly version: string;
  readonly readmeChanged: boolean;
  readonly projectionChanged: boolean;
};

export function syncComparisonVersions(root: string = ROOT): SyncResult {
  const version = readLockstepVersion(root);
  const readmePath = join(root, "README.md");
  const projectionPath = join(root, "apps/docs/src/lib/generated/benchmark-charts.ts");

  const readmeBefore = readFileSync(readmePath, "utf8");
  const readmeRewritten = syncReadmeApiStability(readmeBefore, version);
  let readmeChanged = readmeRewritten !== readmeBefore;
  if (readmeChanged) {
    writeFileSync(readmePath, readmeRewritten);
    // Re-pad the comparison table when version width changed (Devin finding).
    prettierFormatMarkdown(readmePath, root);
  }

  const projBefore = readFileSync(projectionPath, "utf8");
  const projAfter = syncBenchmarkGgsvelteVersion(projBefore, version);
  const projectionChanged = projAfter !== projBefore;
  if (projectionChanged) writeFileSync(projectionPath, projAfter);

  return { version, readmeChanged, projectionChanged };
}

export function checkComparisonVersions(root: string = ROOT): void {
  const version = readLockstepVersion(root);
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const projection = readFileSync(
    join(root, "apps/docs/src/lib/generated/benchmark-charts.ts"),
    "utf8",
  );

  // Version presence (not full-file equality after prettier padding).
  const apiCell = new RegExp(
    String.raw`\|\s*\*\*API stability\*\*\s*\|\s*⚠️ v${version.replaceAll(".", String.raw`\.`)}\s*\|`,
  );
  const stale: string[] = [];
  if (!apiCell.test(readme)) stale.push("README.md");
  const wantProj = syncBenchmarkGgsvelteVersion(projection, version);
  if (wantProj !== projection) {
    stale.push("apps/docs/src/lib/generated/benchmark-charts.ts");
  }
  if (stale.length > 0) {
    throw new Error(
      `comparison-table version is STALE for ${version} (${stale.join(", ")}). ` +
        "Run: bun run comparison:versions:sync",
    );
  }
}

function main(argv: readonly string[]): void {
  const check = argv.includes("--check");
  if (check) {
    checkComparisonVersions(ROOT);
    console.log(
      `comparison versions current (ggsvelte v${readLockstepVersion(ROOT)} in README + docs projection).`,
    );
    return;
  }
  const result = syncComparisonVersions(ROOT);
  if (!result.readmeChanged && !result.projectionChanged) {
    console.log(`comparison versions already at v${result.version}`);
    return;
  }
  const parts = [
    result.readmeChanged ? "README.md" : null,
    result.projectionChanged ? "benchmark-charts.ts" : null,
  ].filter((p): p is string => p !== null);
  console.log(`comparison versions synced to v${result.version} (${parts.join(", ")})`);
}

if (import.meta.main) {
  main(process.argv.slice(2));
}
