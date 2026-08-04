/**
 * Emit bun-style benchmark-vs-peers charts for the docs homepage and README.
 *
 * Data source of truth: benchmarks/competitive/results/*.json (run
 * `bun run measure:browser && bun run measure:bundles` there first). Charts
 * are drawn with ggsvelte itself (headless renderToSVGString) — see
 * apps/docs/src/lib/benchmarks/charts.ts for the claim discipline: only
 * benchmarks where ggsvelte beats BOTH direct Svelte peers get a chart.
 *
 *   bun scripts/gen-benchmark-charts.ts
 *   bun scripts/gen-benchmark-charts.ts --check
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import {
  benchmarkChartDarkSiteSvg,
  benchmarkChartSvg,
  type BenchmarkChartInput,
} from "../apps/docs/src/lib/benchmarks/charts.js";
import { formatGeneratedSource } from "./artifact.ts";

const ROOT = resolve(import.meta.dir, "..");
const COMPETITIVE = join(ROOT, "benchmarks", "competitive");
const OUTPUT_DIR = join(ROOT, "apps", "docs", "static", "benchmarks");
const PROJECTION = join(ROOT, "apps", "docs", "src", "lib", "generated", "benchmark-charts.ts");

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;

interface BrowserResults {
  readonly generatedAt: string;
  readonly results: readonly {
    readonly lib: string;
    readonly caseId: string;
    readonly ok: boolean;
    readonly mountMedianMs?: number;
  }[];
}

interface BundleResults {
  readonly results: readonly {
    readonly lib: string;
    readonly scenario: string;
    readonly ok: boolean;
    readonly gzipKB?: number;
  }[];
}

function readJson(name: string): unknown {
  const path = join(COMPETITIVE, "results", name);
  if (!existsSync(path)) {
    throw new Error(
      `${name} is missing. Run the competitive benchmarks first:\n` +
        "  cd benchmarks/competitive && bun run measure:browser && bun run measure:bundles",
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** True when the source benchmark results exist (local after measure:*, never in CI). */
function resultsAvailable(): boolean {
  return (
    existsSync(join(COMPETITIVE, "results", "browser.json")) &&
    existsSync(join(COMPETITIVE, "results", "bundles.json"))
  );
}

/** Cold-mount median for a lib×case cell; fails loudly when absent. */
function mountMs(browser: BrowserResults, lib: string, caseId: string): number {
  const cell = browser.results.find((r) => r.lib === lib && r.caseId === caseId && r.ok);
  if (cell?.mountMedianMs === undefined) {
    throw new Error(
      `browser results missing ${lib}/${caseId}. Re-run: cd benchmarks/competitive && bun run measure:browser`,
    );
  }
  return cell.mountMedianMs;
}

function bundleGzipKb(bundles: BundleResults, lib: string, scenario: string): number {
  const cell = bundles.results.find((r) => r.lib === lib && r.scenario === scenario && r.ok);
  if (cell?.gzipKB === undefined) {
    throw new Error(
      `bundle results missing ${lib}/${scenario}. Re-run: cd benchmarks/competitive && bun run measure:bundles`,
    );
  }
  return cell.gzipKB;
}

/** Bun label style: one decimal under 1,000 ("75.5 ms"), rounded thousands after ("7,193 ms"). */
function msLabel(value: number): string {
  if (value < 1000) {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)} ms`;
  }
  return `${Math.round(value).toLocaleString("en-US")} ms`;
}

/** Resolved peer versions (displayed under the chart grid and in the README). */
function installedVersion(pkg: string): string {
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

interface ChartCard {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly chart: BenchmarkChartInput;
}

function buildCards(browser: BrowserResults): readonly ChartCard[] {
  const scatter = {
    gg: mountMs(browser, "ggsvelte-svg", "scatter-color-10k"),
    lc: mountMs(browser, "layercake", "scatter-color-10k"),
    sp: mountMs(browser, "svelteplot", "scatter-color-10k"),
  };
  const line = {
    gg: mountMs(browser, "ggsvelte-svg", "line-3x10k"),
    lc: mountMs(browser, "layercake", "line-3x10k"),
    sp: mountMs(browser, "svelteplot", "line-3x10k"),
  };

  // Claim discipline: refuse to publish a chart ggsvelte does not win.
  for (const [name, cell] of Object.entries({ scatter, line })) {
    if (!(cell.gg < cell.lc && cell.gg < cell.sp)) {
      throw new Error(
        `${name}: ggsvelte (${String(cell.gg)} ms) no longer beats both peers ` +
          `(LayerCake ${String(cell.lc)} ms, SveltePlot ${String(cell.sp)} ms). ` +
          "Drop the chart from buildCards() — the homepage only claims benchmarks ggsvelte wins.",
      );
    }
  }

  const subtitle = "Cold-mount milliseconds · lower is better";
  const bars = (cell: { gg: number; lc: number; sp: number }) =>
    [
      { lib: "ggsvelte", value: cell.gg, kind: "ggsvelte", label: msLabel(cell.gg) },
      { lib: "LayerCake", value: cell.lc, kind: "peer", label: msLabel(cell.lc) },
      { lib: "SveltePlot", value: cell.sp, kind: "peer", label: msLabel(cell.sp) },
    ] as const;

  const aria = (what: string, cell: { gg: number; lc: number; sp: number }) =>
    `Bar chart of cold-mount time for ${what}: ggsvelte ${msLabel(cell.gg)}, ` +
    `LayerCake ${msLabel(cell.lc)}, SveltePlot ${msLabel(cell.sp)}. Lower is better.`;

  return [
    {
      id: "scatter-mount",
      title: "10,000-point colored scatter",
      subtitle,
      chart: {
        id: "scatter-mount",
        bars: bars(scatter),
        ariaLabel: aria("a 10,000-point colored scatter", scatter),
      },
    },
    {
      id: "line-mount",
      title: "3 × 10,000-point line chart",
      subtitle,
      chart: {
        id: "line-mount",
        bars: bars(line),
        ariaLabel: aria("a 3-series by 10,000-point line chart", line),
      },
    },
  ];
}

function sha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

type ShellFile = { filename: string; body: string };

function projectionSource(
  files: readonly ShellFile[],
  cards: readonly ChartCard[],
  versions: { ggsvelte: string; svelteplot: string; layercake: string },
  bundles: { ggsvelteKb: number; svelteplotKb: number; layercakeKb: number },
  generatedAt: string,
): Promise<string> {
  const entries = cards
    .map((card) => {
      const light = files.find((f) => f.filename === `bench-${card.id}.svg`)!;
      const dark = files.find((f) => f.filename === `bench-${card.id}-dark-site.svg`)!;
      return `  {
    id: ${JSON.stringify(card.id)},
    title: ${JSON.stringify(card.title)},
    subtitle: ${JSON.stringify(card.subtitle)},
    path: ${JSON.stringify(`/benchmarks/${light.filename}`)},
    darkPath: ${JSON.stringify(`/benchmarks/${dark.filename}`)},
    sha256: ${JSON.stringify(sha256(light.body))},
    alt: ${JSON.stringify(card.chart.ariaLabel)},
    width: ${String(CHART_WIDTH)},
    height: ${String(CHART_HEIGHT)},
  }`;
    })
    .join(",\n");
  const raw = `// Generated by bun scripts/gen-benchmark-charts.ts — do not edit.
// Numbers: benchmarks/competitive/results/*.json (browser run ${generatedAt}).

export interface BenchmarkChartCard {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly path: string;
  /** Dark-site portrait (transparent paper, light ink) — shown under data-theme="dark". */
  readonly darkPath: string;
  readonly sha256: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export const BENCHMARK_CHART_CARDS = [
${entries},
] as const;

export const BENCHMARK_VERSIONS = ${JSON.stringify(versions)} as const;

/** Min+gzip KB of the 1,000-point colored-scatter app bundle. */
export const BENCHMARK_BUNDLE_KB = ${JSON.stringify(bundles)} as const;
`;
  // Match pre-commit oxfmt so --check stays byte-stable.
  return formatGeneratedSource(PROJECTION, raw);
}

function build() {
  const browser = readJson("browser.json") as BrowserResults;
  const bundles = readJson("bundles.json") as BundleResults;
  const cards = buildCards(browser);
  const files: ShellFile[] = cards.flatMap((card) => {
    const light = benchmarkChartSvg(card.chart, { width: CHART_WIDTH, height: CHART_HEIGHT });
    return [
      { filename: `bench-${card.id}.svg`, body: light },
      { filename: `bench-${card.id}-dark-site.svg`, body: benchmarkChartDarkSiteSvg(light) },
    ];
  });
  const versions = {
    ggsvelte: (
      JSON.parse(readFileSync(join(ROOT, "packages", "svelte", "package.json"), "utf8")) as {
        version: string;
      }
    ).version,
    svelteplot: installedVersion("svelteplot"),
    layercake: installedVersion("layercake"),
  };
  const bundleKb = {
    ggsvelteKb: bundleGzipKb(bundles, "ggsvelte-svg", "scatter-color"),
    svelteplotKb: bundleGzipKb(bundles, "svelteplot", "scatter-color"),
    layercakeKb: bundleGzipKb(bundles, "layercake", "scatter-color"),
  };
  return { files, cards, versions, bundleKb, generatedAt: browser.generatedAt };
}

async function check(): Promise<void> {
  if (!existsSync(OUTPUT_DIR) || !existsSync(PROJECTION)) {
    throw new Error("benchmark charts are MISSING. Run: bun scripts/gen-benchmark-charts.ts");
  }

  // The results/*.json source of truth is gitignored (re-run measure:* to
  // produce it), so CI has no benchmark data. When absent, verify the
  // committed artifacts are internally consistent (projection ⇄ SVGs); when
  // present (local), do the full regeneration-compare freshness check.
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

async function write(): Promise<void> {
  const { files, cards, versions, bundleKb, generatedAt } = build();
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const file of files) {
    writeFileSync(join(OUTPUT_DIR, file.filename), file.body);
  }
  writeFileSync(PROJECTION, await projectionSource(files, cards, versions, bundleKb, generatedAt));
  console.log(`wrote ${String(files.length)} benchmark charts to ${OUTPUT_DIR}`);
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    await check();
  } else {
    await write();
  }
}
