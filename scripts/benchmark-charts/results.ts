/**
 * Benchmark results access — the gitignored JSON source of truth under
 * benchmarks/competitive/results, plus resolved peer package versions.
 *
 * Data source of truth: benchmarks/competitive/results/*.json (run
 * `bun run measure:browser && bun run measure:bundles` there first; for the
 * Line 100k form-factor card also `bun run measure-100k-peers.ts`). Charts are
 * drawn with ggsvelte itself (headless renderToSVGString) — see
 * apps/docs/src/lib/benchmarks/charts.ts for the claim discipline.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dir, "..", "..");
const COMPETITIVE = join(ROOT, "benchmarks", "competitive");
export const OUTPUT_DIR = join(ROOT, "apps", "docs", "static", "benchmarks");
export const PROJECTION = join(
  ROOT,
  "apps",
  "docs",
  "src",
  "lib",
  "generated",
  "benchmark-charts.ts",
);

export interface BrowserResults {
  readonly generatedAt: string;
  readonly results: readonly {
    readonly lib: string;
    readonly caseId: string;
    readonly ok: boolean;
    readonly mountMedianMs?: number;
  }[];
}

export interface BundleResults {
  readonly results: readonly {
    readonly lib: string;
    readonly scenario: string;
    readonly ok: boolean;
    readonly gzipKB?: number;
  }[];
}

export function readJson(name: string): unknown {
  const path = join(COMPETITIVE, "results", name);
  if (!existsSync(path)) {
    throw new Error(
      `${name} is missing. Run the competitive benchmarks first:\n` +
        "  cd benchmarks/competitive && bun run measure:browser && bun run measure:bundles\n" +
        "  cd benchmarks/competitive && bun run measure-100k-peers.ts   # 100k form-factor cards",
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** True when the source benchmark results exist (local after measure:*, never in CI). */
export function resultsAvailable(): boolean {
  return (
    existsSync(join(COMPETITIVE, "results", "browser.json")) &&
    existsSync(join(COMPETITIVE, "results", "bundles.json")) &&
    existsSync(join(COMPETITIVE, "results", "browser-100k-peers.json"))
  );
}

/** Cold-mount median for a lib×case cell; fails loudly when absent. */
export function mountMs(browser: BrowserResults, lib: string, caseId: string): number {
  const cell = browser.results.find((r) => r.lib === lib && r.caseId === caseId && r.ok);
  if (cell?.mountMedianMs === undefined) {
    throw new Error(
      `browser results missing ${lib}/${caseId}. Re-run the competitive browser measure for this case.`,
    );
  }
  return cell.mountMedianMs;
}

export function bundleGzipKb(bundles: BundleResults, lib: string, scenario: string): number {
  const cell = bundles.results.find((r) => r.lib === lib && r.scenario === scenario && r.ok);
  if (cell?.gzipKB === undefined) {
    throw new Error(
      `bundle results missing ${lib}/${scenario}. Re-run: cd benchmarks/competitive && bun run measure:bundles`,
    );
  }
  return cell.gzipKB;
}

/** Resolved peer versions (displayed under the chart grid and in the README). */
export function installedVersion(pkg: string): string {
  for (const base of [join(COMPETITIVE, "node_modules", pkg), join(ROOT, "node_modules", pkg)]) {
    try {
      const real = realpathSync(base);
      const manifest = JSON.parse(readFileSync(join(real, "package.json"), "utf8")) as {
        version?: string;
      };
      if (manifest.version !== undefined) return manifest.version;
    } catch {
      // try the next layout
    }
  }
  throw new Error(`could not resolve installed version of ${pkg}`);
}
