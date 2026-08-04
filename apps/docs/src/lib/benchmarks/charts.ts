/**
 * Bun-style benchmark comparison charts, drawn with ggsvelte itself
 * (headless renderToSVGString — dogfooding the agent surface). Numbers come
 * from benchmarks/competitive/results/*.json via scripts/gen-benchmark-charts.ts;
 * never hand-edit the rendered SVGs.
 *
 * Claim discipline: a chart exists only for a benchmark where ggsvelte beats
 * BOTH direct Svelte peers (SveltePlot and LayerCake). Cells we lose stay in
 * the results JSON and off the homepage. Conventions follow bun.sh: the
 * subject bar is shaded in the brand accent, peer bars stay grey, value
 * labels sit at bar ends, and time benchmarks ("faster") use horizontal bars.
 */
import { registerAll, renderToSVGString } from "@ggsvelte/core";

// Headless full-grammar rendering (#1420): explicit opt-in.
registerAll();

import type { PortableSpec, ThemeSpec } from "@ggsvelte/spec";
import { validate } from "@ggsvelte/spec";

/** Docs site accent (app.css --accent, light site) — the ggsvelte bar. */
export const BENCH_GGSVELTE_FILL = "#4269d0";
/** Dark-shell accent (app.css --accent under data-theme="dark"). */
export const BENCH_GGSVELTE_FILL_DARK = "#7ea1f0";
/** Neutral grey for peer bars — only the subject is shaded. */
export const BENCH_PEER_FILL = "#c9cfda";

/** Clean card look: no grid, no panel border (bun-style). */
const BENCH_THEME: ThemeSpec = {
  name: "light",
  grid: "transparent",
  panelBorder: "transparent",
};

/**
 * Fallbacks baked into the dark-site SVG (`bench-*-dark-site.svg`). These
 * mirror MARKS_ONLY_DARK_SITE_ROLES + the dark-shell accent: transparent
 * paper (host card bg shows through), light ink/axis/ticks. Peer grey and
 * band/measure positions are unchanged; only chrome recolors.
 */
const DARK_SITE_FALLBACKS: Record<string, string> = {
  "var(--gg-paper, #ffffff)": "var(--gg-paper, transparent)",
  "var(--gg-panel, #ffffff)": "var(--gg-panel, transparent)",
  "var(--gg-ink, #333333)": "var(--gg-ink, #e9edf4)",
  "var(--gg-axisText, #4d4d4d)": "var(--gg-axisText, #aab4c4)",
  "var(--gg-tickColor, #b3b3b3)": "var(--gg-tickColor, #e9edf4)",
  // Subject bar accent: dark-shell blue.
  [BENCH_GGSVELTE_FILL]: BENCH_GGSVELTE_FILL_DARK,
};

/**
 * Produce the dark-site variant of a rendered light SVG by rebaking the
 * var(--gg-*) fallback literals. External <img>-loaded SVGs cannot inherit
 * host CSS custom properties, so the dark portrait is a separate file whose
 * fallbacks are already dark — same convention as theme-*-dark-site.svg.
 */
export function benchmarkChartDarkSiteSvg(lightSvg: string): string {
  let out = lightSvg;
  for (const [from, to] of Object.entries(DARK_SITE_FALLBACKS)) {
    out = out.split(from).join(to);
  }
  return out;
}

export interface BenchmarkBar {
  /** Display name on the band axis, e.g. "ggsvelte". */
  readonly lib: string;
  readonly value: number;
  readonly kind: "ggsvelte" | "peer";
  /** Rendered value label at the bar end, e.g. "75.5 ms". */
  readonly label: string;
}

export interface BenchmarkChartInput {
  readonly id: string;
  /** Bars in display order — subject first, then peers ascending. */
  readonly bars: readonly BenchmarkBar[];
  /** Accessible summary baked into the SVG aria-label and <title>. */
  readonly ariaLabel: string;
}

/**
 * Horizontal bar chart spec (coord flip): lower-is-better time benchmarks.
 * The quantitative axis is hidden (guides y none) — bar-end labels carry the
 * values, like bun's bundler chart.
 */
export function benchmarkChartSpec(input: BenchmarkChartInput): PortableSpec {
  const spec = {
    data: { values: input.bars },
    aes: { x: { field: "lib" }, y: { field: "value" } },
    layers: [
      {
        geom: "col",
        aes: { fill: { field: "kind" } },
        params: { width: 0.62 },
      },
      {
        geom: "text",
        aes: { label: { field: "label" } },
        // Under coord flip, pre-flip dy pushes the label past the bar end.
        params: { anchor: "start", dx: 0, dy: -6, size: 12 },
      },
    ],
    scales: {
      // Under coord flip, band categories paint bottom-to-top — reverse the
      // logical order so the subject bar lands on top (bun's position).
      x: { type: "band", domain: input.bars.toReversed().map((bar) => bar.lib) },
      // Headroom past the longest bar so bar-end value labels never clip.
      y: { expand: { mult: 0.16, add: 0 } },
      fill: {
        type: "manual",
        domain: ["ggsvelte", "peer"],
        range: [BENCH_GGSVELTE_FILL, BENCH_PEER_FILL],
      },
    },
    coord: { type: "flip" },
    guides: { fill: { type: "none" }, y: { type: "none" } },
    labs: { x: "" },
    theme: BENCH_THEME,
  };
  return spec as unknown as PortableSpec;
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Validate (the agent contract, dogfooded) and render to a standalone SVG
 * with a descriptive accessible name. Throws on any validation error so a
 * broken chart can never reach the homepage.
 */
export function benchmarkChartSvg(
  input: BenchmarkChartInput,
  options: { readonly width: number; readonly height: number },
): string {
  const spec = benchmarkChartSpec(input);
  const result = validate(spec);
  if (!result.ok) {
    const first = result.errors[0];
    throw new Error(
      `benchmark chart "${input.id}" failed validation: ${first?.code} at ${first?.path}: ${first?.message}`,
    );
  }
  const label = escapeXml(input.ariaLabel);
  return renderToSVGString(spec, options)
    .replace(/aria-label="[^"]*"/, `aria-label="${label}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${label}</title>`);
}
