/**
 * Benchmark chart cards — the default-matrix and form-factor card catalogue.
 *
 * Claim-discipline guards here are hard failures: the homepage only claims
 * benchmarks ggsvelte wins, so a lost cell must drop its card, never soften.
 */

import type { BenchmarkBar, BenchmarkChartInput } from "../../apps/docs/src/lib/benchmarks/charts";

import { mountMs, type BrowserResults } from "./results";

const CHART_WIDTH = 560;
/** Title chrome + six default-matrix bars (ggsvelte SVG + five peers, including ECharts). */
const CHART_HEIGHT_6 = 380;

export interface ChartCard {
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

/** Bun label style: one decimal under 1,000 ("75.5 ms"), rounded thousands after ("7,193 ms"). */
function msLabel(value: number): string {
  if (value < 1000) {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)} ms`;
  }
  return `${Math.round(value).toLocaleString("en-US")} ms`;
}

export function buildCards(
  browser: BrowserResults,
  peers100k: BrowserResults,
): readonly ChartCard[] {
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
