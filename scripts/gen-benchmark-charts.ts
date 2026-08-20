/**
 * Emit bun-style benchmark-vs-peers charts for the docs homepage and README.
 *
 * Data source of truth: benchmarks/competitive/results/*.json (run
 * `bun run measure:browser && bun run measure:bundles` there first; for the
 * Line 100k form-factor card also `bun run measure-100k-peers.ts`). Charts are drawn
 * with ggsvelte itself (headless renderToSVGString) — see
 * apps/docs/src/lib/benchmarks/charts.ts for the claim discipline.
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
  type BenchmarkBar,
  type BenchmarkChartInput,
} from "../apps/docs/src/lib/benchmarks/charts.js";
import { formatGeneratedSource } from "./artifact.ts";

const ROOT = resolve(import.meta.dir, "..");
const COMPETITIVE = join(ROOT, "benchmarks", "competitive");
const OUTPUT_DIR = join(ROOT, "apps", "docs", "static", "benchmarks");
const PROJECTION = join(ROOT, "apps", "docs", "src", "lib", "generated", "benchmark-charts.ts");

const CHART_WIDTH = 560;
/** Title chrome + six default-matrix bars (ggsvelte SVG + five peers, including ECharts). */
const CHART_HEIGHT_6 = 380;

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
        "  cd benchmarks/competitive && bun run measure:browser && bun run measure:bundles\n" +
        "  cd benchmarks/competitive && bun run measure-100k-peers.ts   # 100k form-factor cards",
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** True when the source benchmark results exist (local after measure:*, never in CI). */
function resultsAvailable(): boolean {
  return (
    existsSync(join(COMPETITIVE, "results", "browser.json")) &&
    existsSync(join(COMPETITIVE, "results", "bundles.json")) &&
    existsSync(join(COMPETITIVE, "results", "browser-100k-peers.json"))
  );
}

/** Cold-mount median for a lib×case cell; fails loudly when absent. */
function mountMs(browser: BrowserResults, lib: string, caseId: string): number {
  const cell = browser.results.find((r) => r.lib === lib && r.caseId === caseId && r.ok);
  if (cell?.mountMedianMs === undefined) {
    throw new Error(
      `browser results missing ${lib}/${caseId}. Re-run the competitive browser measure for this case.`,
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
  /** Short label on the homepage tab trigger (bun-style: one or two words). */
  readonly tab: string;
  readonly title: string;
  readonly subtitle: string;
  readonly width: number;
  readonly height: number;
  readonly chart: BenchmarkChartInput;
}

/**
 * Default-matrix cold-mount cell: ggsvelte SVG vs Svelte peers plus ECharts.
 * ECharts is a canvas generalist that still paints a full chart (grid + axes),
 * so the published comparator is ggsvelte-svg, not the marks-only canvas harness.
 */
type PeerCell = { gg: number; lc: number; sp: number; uv: number; ts: number; ec: number };

/**
 * Form-factor cold-mount cell: both ggsvelte paths + LayerCake SVG/canvas +
 * Unovis + TanStack Svelte. Used for the Line 100k homepage tab. SveltePlot is
 * measured in the 100k harness but omitted from that chart — its mount time
 * stretches the axis so the other bars collapse.
 */
type FormFactorCell = {
  ggSvg: number;
  ggCanvas: number;
  lcSvg: number;
  lcCanvas: number;
  uv: number;
  ts: number;
};

function assertSvgPeerWin(name: string, c: PeerCell): void {
  if (!(c.gg < c.lc && c.gg < c.sp && c.gg < c.uv && c.gg < c.ts && c.gg < c.ec)) {
    throw new Error(
      `${name}: ggsvelte (${String(c.gg)} ms) no longer beats every published peer ` +
        `(LayerCake ${String(c.lc)} ms, SveltePlot ${String(c.sp)} ms, Unovis ${String(c.uv)} ms, ` +
        `TanStack ${String(c.ts)} ms, ECharts ${String(c.ec)} ms). ` +
        "Drop the chart from buildCards() — the homepage only claims benchmarks ggsvelte wins.",
    );
  }
}

/**
 * Multi-form 100k charts show canvas LayerCake for honesty (it can beat
 * ggsvelte on some cells). Claim discipline: ggsvelte SVG must still beat the
 * SVG peers drawn on the chart (LayerCake SVG, Unovis, TanStack Svelte).
 */
function assertFormFactorSvgWin(name: string, c: FormFactorCell): void {
  if (!(c.ggSvg < c.lcSvg && c.ggSvg < c.uv && c.ggSvg < c.ts)) {
    throw new Error(
      `${name}: ggsvelte SVG (${String(c.ggSvg)} ms) no longer beats SVG peers ` +
        `(LayerCake ${String(c.lcSvg)} ms, Unovis ${String(c.uv)} ms, TanStack ${String(c.ts)} ms). ` +
        "Drop the chart from buildCards().",
    );
  }
}

function buildCards(browser: BrowserResults, peers100k: BrowserResults): readonly ChartCard[] {
  /** Cold-mount cell for the homepage Svelte-peer set at one case. */
  const cell = (caseId: string): PeerCell => ({
    gg: mountMs(browser, "ggsvelte-svg", caseId),
    lc: mountMs(browser, "layercake", caseId),
    sp: mountMs(browser, "svelteplot", caseId),
    uv: mountMs(browser, "unovis", caseId),
    ts: mountMs(browser, "tanstack-svelte", caseId),
    ec: mountMs(browser, "echarts", caseId),
  });

  const formCell = (caseId: string): FormFactorCell => ({
    ggSvg: mountMs(peers100k, "ggsvelte-svg", caseId),
    ggCanvas: mountMs(peers100k, "ggsvelte-canvas", caseId),
    lcSvg: mountMs(peers100k, "layercake", caseId),
    lcCanvas: mountMs(peers100k, "layercake-canvas", caseId),
    uv: mountMs(peers100k, "unovis", caseId),
    ts: mountMs(peers100k, "tanstack-svelte", caseId),
  });

  const cells = {
    scatter1k: cell("scatter-color-1k"),
    scatter10k: cell("scatter-color-10k"),
    area3x1k: cell("area-3x1k"),
    bars50x4: cell("bars-stacked-50x4"),
  };

  const formCells = {
    line10x10k: formCell("line-10x10k"),
  };

  for (const [name, c] of Object.entries(cells)) assertSvgPeerWin(name, c);
  for (const [name, c] of Object.entries(formCells)) assertFormFactorSvgWin(name, c);

  const subtitle = "Cold-mount milliseconds · lower is better";
  const formSubtitle = "Cold-mount milliseconds · lower is better · SveltePlot omitted";
  // Sort by mount time so first-seen data order matches the pinned band
  // domain. The spec still owns display rank (domain + reverse).
  const bars = (c: PeerCell): readonly BenchmarkBar[] =>
    (
      [
        { lib: "ggsvelte", value: c.gg, kind: "ggsvelte", label: msLabel(c.gg) },
        { lib: "LayerCake", value: c.lc, kind: "peer", label: msLabel(c.lc) },
        { lib: "TanStack", value: c.ts, kind: "peer", label: msLabel(c.ts) },
        { lib: "ECharts", value: c.ec, kind: "peer", label: msLabel(c.ec) },
        { lib: "Unovis", value: c.uv, kind: "peer", label: msLabel(c.uv) },
        { lib: "SveltePlot", value: c.sp, kind: "peer", label: msLabel(c.sp) },
      ] as const satisfies readonly BenchmarkBar[]
    ).toSorted((a, b) => a.value - b.value || a.lib.localeCompare(b.lib));

  /**
   * Six form-factor rows ordered by cold-mount rank (fastest top). ggsvelte
   * bars stay shaded via kind; they do not jump the queue when a peer wins.
   * SveltePlot is omitted so a 25–60s bar does not flatten the rest.
   */
  const formBars = (c: FormFactorCell): readonly BenchmarkBar[] =>
    (
      [
        { lib: "ggsvelte SVG", value: c.ggSvg, kind: "ggsvelte", label: msLabel(c.ggSvg) },
        { lib: "ggsvelte canvas", value: c.ggCanvas, kind: "ggsvelte", label: msLabel(c.ggCanvas) },
        { lib: "LayerCake", value: c.lcSvg, kind: "peer", label: msLabel(c.lcSvg) },
        { lib: "LayerCake canvas", value: c.lcCanvas, kind: "peer", label: msLabel(c.lcCanvas) },
        { lib: "TanStack", value: c.ts, kind: "peer", label: msLabel(c.ts) },
        { lib: "Unovis", value: c.uv, kind: "peer", label: msLabel(c.uv) },
      ] as const satisfies readonly BenchmarkBar[]
    ).toSorted((a, b) => a.value - b.value);

  const aria = (what: string, c: PeerCell) =>
    `Bar chart of cold-mount time for ${what}: ggsvelte ${msLabel(c.gg)}, ` +
    `ECharts ${msLabel(c.ec)}, LayerCake ${msLabel(c.lc)}, TanStack ${msLabel(c.ts)}, ` +
    `Unovis ${msLabel(c.uv)}, SveltePlot ${msLabel(c.sp)}. Lower is better.`;

  const formAria = (what: string, c: FormFactorCell) =>
    `Bar chart of cold-mount time for ${what}: ggsvelte SVG ${msLabel(c.ggSvg)}, ` +
    `ggsvelte canvas ${msLabel(c.ggCanvas)}, LayerCake ${msLabel(c.lcSvg)}, ` +
    `LayerCake canvas ${msLabel(c.lcCanvas)}, TanStack ${msLabel(c.ts)}, Unovis ${msLabel(c.uv)}. ` +
    `Lower is better. SveltePlot is omitted because it is too slow for this scale.`;

  const card = (
    id: string,
    tab: string,
    title: string,
    ariaWhat: string,
    c: PeerCell,
  ): ChartCard => ({
    id,
    tab,
    title,
    subtitle,
    width: CHART_WIDTH,
    height: CHART_HEIGHT_6,
    chart: {
      id,
      bars: bars(c),
      title,
      subtitle,
      ariaLabel: aria(ariaWhat, c),
    },
  });

  const formCard = (
    id: string,
    tab: string,
    title: string,
    ariaWhat: string,
    c: FormFactorCell,
  ): ChartCard => ({
    id,
    tab,
    title,
    subtitle: formSubtitle,
    width: CHART_WIDTH,
    height: CHART_HEIGHT_6,
    chart: {
      id,
      bars: formBars(c),
      title,
      subtitle: formSubtitle,
      ariaLabel: formAria(ariaWhat, c),
    },
  });

  // Tab order: Area, Bars, Line 100k, Scatter, Scatter 10k. The 3×10k Line
  // tab was dropped (#1471 follow-up): post-svg-live measurements no longer
  // beat ECharts canvas on cold mount, so claim discipline removes the card.
  return [
    card(
      "area-mount",
      "Area",
      "3 × 1,000-point area chart",
      "a 3-series by 1,000-point area chart",
      cells.area3x1k,
    ),
    card(
      "bars-mount",
      "Bars",
      "50 categories × 4 stacks",
      "a stacked bar chart of 50 categories by 4 stacks",
      cells.bars50x4,
    ),
    formCard(
      "line-100k-mount",
      "Line 100k",
      "10 × 10,000-point line chart",
      "a 10-series by 10,000-point line chart",
      formCells.line10x10k,
    ),
    card(
      "scatter-1k-mount",
      "Scatter",
      "1,000-point colored scatter",
      "a 1,000-point colored scatter",
      cells.scatter1k,
    ),
    card(
      "scatter-mount",
      "Scatter 10k",
      "10,000-point colored scatter",
      "a 10,000-point colored scatter",
      cells.scatter10k,
    ),
  ];
}

function sha256(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

type ShellFile = { filename: string; body: string };

function projectionSource(
  files: readonly ShellFile[],
  cards: readonly ChartCard[],
  versions: {
    ggsvelte: string;
    svelteplot: string;
    layercake: string;
    unovis: string;
    tanstack: string;
  },
  bundles: {
    ggsvelteKb: number;
    svelteplotKb: number;
    layercakeKb: number;
    unovisKb: number;
    tanstackKb: number;
  },
  generatedAt: string,
): Promise<string> {
  const entries = cards
    .map((card) => {
      const light = files.find((f) => f.filename === `bench-${card.id}.svg`)!;
      const dark = files.find((f) => f.filename === `bench-${card.id}-dark-site.svg`)!;
      return `  {
    id: ${JSON.stringify(card.id)},
    tab: ${JSON.stringify(card.tab)},
    title: ${JSON.stringify(card.title)},
    subtitle: ${JSON.stringify(card.subtitle)},
    path: ${JSON.stringify(`/benchmarks/${light.filename}`)},
    darkPath: ${JSON.stringify(`/benchmarks/${dark.filename}`)},
    sha256: ${JSON.stringify(sha256(light.body))},
    alt: ${JSON.stringify(card.chart.ariaLabel)},
    width: ${String(card.width)},
    height: ${String(card.height)},
  }`;
    })
    .join(",\n");
  const raw = `// Generated by bun scripts/gen-benchmark-charts.ts — do not edit.
// Numbers: benchmarks/competitive/results/*.json (browser ${generatedAt}).

export interface BenchmarkChartCard {
  readonly id: string;
  /** Short label on the homepage tab trigger. */
  readonly tab: string;
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
  const peers100k = readJson("browser-100k-peers.json") as BrowserResults;
  const bundles = readJson("bundles.json") as BundleResults;
  const cards = buildCards(browser, peers100k);
  const files: ShellFile[] = cards.flatMap((card) => {
    const light = benchmarkChartSvg(card.chart, { width: card.width, height: card.height });
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
    unovis: installedVersion("@unovis/svelte"),
    tanstack: installedVersion("@tanstack/charts"),
  };
  const bundleKb = {
    ggsvelteKb: bundleGzipKb(bundles, "ggsvelte-svg", "scatter-color"),
    svelteplotKb: bundleGzipKb(bundles, "svelteplot", "scatter-color"),
    layercakeKb: bundleGzipKb(bundles, "layercake", "scatter-color"),
    unovisKb: bundleGzipKb(bundles, "unovis", "scatter-color"),
    tanstackKb: bundleGzipKb(bundles, "tanstack-svelte", "scatter-color"),
  };
  // Stamp both sources so --check staleness covers 100k re-measures.
  const generatedAt = `${browser.generatedAt}; 100k peers ${peers100k.generatedAt}`;
  return { files, cards, versions, bundleKb, generatedAt };
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
