/**
 * Static SVG shells for /themes multi-plot pages.
 *
 * Live <GGPlot> trees are expensive to hydrate (full interaction controllers).
 * SSR + first client paint use these strings so the page is readable and
 * full-width immediately; user intent (hover/focus) upgrades to interactive.
 */
import { renderToSVGString } from "@ggsvelte/core";
import { aes, gg, scaleXLog10, type AuthoringRows, type ThemeName } from "@ggsvelte/spec";

import { MONTH_BREAKS, type SchemeName, type ThemeSpecimenKind } from "./catalog.js";
import {
  attendees,
  cities,
  countries,
  generation,
  grid,
  armadaTonnage,
  longRunSeries,
  penguins,
  revenue,
  ridership,
  temperaturesKeyed,
} from "./data.js";
import { TEMPERATURES_CHART } from "./temperatures-chart.js";

/** Matches packages/svelte DEFAULT_PLOT_WIDTH_PX and docs .plot-panel max. */
export const DOCS_STATIC_PLOT_WIDTH_PX = 832;

const cache = new Map<string, string>();

/**
 * Headless SVG uses fixed ids (`gg-clip-0`, `gg-ramp-fill`). Multiple shells on
 * one page collide (url(#id) is document-scoped). Namespace each shell so
 * clip/ramp references stay local to that SVG.
 */
function namespaceSvgIds(svg: string, key: string): string {
  const prefix = `s${key.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}`;
  return svg
    .replaceAll(/id="(gg-[^"]+)"/g, `id="${prefix}-$1"`)
    .replaceAll(/url\(#(gg-[^)]+)\)/g, `url(#${prefix}-$1)`);
}

export type ThemeStaticSvgInput = {
  readonly name: ThemeName;
  readonly kind: ThemeSpecimenKind;
  readonly scheme: SchemeName;
  readonly width?: number;
  readonly height?: number;
};

function colorScale(scheme: SchemeName) {
  return { type: "ordinal" as const, scheme };
}

function buildThemeSpec(input: ThemeStaticSvgInput) {
  const { name, kind, scheme } = input;
  const color = colorScale(scheme);

  switch (kind) {
    case "temps-line": {
      const chart = TEMPERATURES_CHART;
      return gg(temperaturesKeyed, aes(chart.aes))
        .geomLine({ linewidth: chart.geomLine.linewidth })
        .geomPoint({ size: chart.geomPoint.size })
        .scales({
          x: { breaks: [...chart.monthBreaks] },
          color,
        })
        .theme(name)
        .labs({ ...chart.labs })
        .spec();
    }
    case "ridership-line":
      return gg(ridership, aes({ x: "month", y: "riders", color: "mode" }))
        .geomLine({ linewidth: 2 })
        .geomPoint({ size: 2.8 })
        .scales({ color })
        .theme(name)
        .labs({
          title: "Playfair wheat price & weekly wage",
          x: "Year",
          y: "Shillings",
          color: "Series",
        })
        .spec();
    case "attendees-dodge":
      return gg(attendees, aes({ x: "track", fill: "level", weight: "deaths" }))
        .geomBar({ position: "dodge" })
        .scales({ fill: color })
        .theme(name)
        .labs({
          title: "Edgeworth county deaths, 1876–82",
          x: "Year",
          y: "Deaths per million",
          fill: "County",
        })
        .spec();
    case "generation-area":
      return gg(generation, aes({ x: "year", y: "twh", fill: "source" }))
        .geomArea({ alpha: 0.9 })
        .scales({ x: { nice: false }, fill: color })
        .theme(name)
        .labs({
          title: "Crimean deaths by cause, 1854–56",
          x: "Year",
          y: "Deaths per 1,000 per year",
          fill: "Cause",
        })
        .spec();
    case "long-run-line":
      return gg(longRunSeries, aes({ x: "year", y: "value" }))
        .geomLine({ linewidth: 1.5 })
        .theme(name)
        .labs({
          title: "British exports, 1855–1899",
          x: "Year",
          y: "£ millions",
        })
        .spec();
    case "penguins-scatter":
      return gg(penguins, aes({ x: "flipper", y: "mass", color: "species" }))
        .geomPoint({ size: 3.5, alpha: 0.9 })
        .scales({ color })
        .theme(name)
        .labs({
          title: "Penguin flipper length and body mass",
          x: "Flipper length (mm)",
          y: "Body mass (g)",
          color: "Species",
        })
        .spec();
    case "countries-scatter":
      return gg(countries, aes({ x: "gdp", y: "lifeExp", color: "region" }))
        .geomPoint({ size: 3.5 })
        .geomSmooth({ method: "lm", se: false })
        .scales({ ...scaleXLog10({ labels: "~s" }), color })
        .theme(name)
        .labs({
          title: "Cholera death rate vs density, 1849",
          x: "People per acre (log scale)",
          y: "Death rate per 10,000",
          color: "Water supply",
        })
        .spec();
    case "revenue-cols":
      return gg(revenue, aes({ x: "quarter", y: "amount" }))
        .geomCol({ width: 0.7 })
        .geomText({ aes: { label: "label" }, dy: -8, size: 11 })
        .theme(name)
        .labs({
          title: "Salk trial paralytic polio rates",
          x: "Group",
          y: "Cases per 100,000",
        })
        .spec();
    case "cities-labels":
      return gg(cities, aes({ x: "rent", y: "livability" }))
        .geomPoint({ size: 3 })
        .geomText({ aes: { label: "city" }, dy: -9, size: 10 })
        .scales({ x: { labels: ".1f" } })
        .theme(name)
        .labs({
          title: "Van Langren longitude estimates, 1644",
          x: "Toledo–Rome longitude (°)",
          y: "Estimate rank",
        })
        .spec();
    default: {
      const exhaustive: never = kind;
      throw new Error(`unhandled theme specimen kind: ${String(exhaustive)}`);
    }
  }
}

export function themeSpecimenStaticSvg(input: ThemeStaticSvgInput): string {
  const width = input.width ?? DOCS_STATIC_PLOT_WIDTH_PX;
  const height = input.height ?? 380;
  const key = `${input.name}:${input.kind}:${input.scheme}:${String(width)}x${String(height)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const svg = namespaceSvgIds(renderToSVGString(buildThemeSpec(input), { width, height }), key);
  cache.set(key, svg);
  return svg;
}

export function temperaturesStaticSvg(input: {
  readonly theme: ThemeName;
  readonly scheme: SchemeName;
  readonly height?: number;
  readonly width?: number;
}): string {
  return themeSpecimenStaticSvg({
    name: input.theme,
    kind: "temps-line",
    scheme: input.scheme,
    height: input.height ?? 400,
    ...(input.width === undefined ? {} : { width: input.width }),
  });
}

export function paletteSpecimenStaticSvg(input: {
  readonly scheme: SchemeName;
  readonly reverse: boolean;
  readonly paperTheme: ThemeName;
  readonly width?: number;
  readonly height?: number;
}): string {
  const width = input.width ?? DOCS_STATIC_PLOT_WIDTH_PX;
  const height = input.height ?? 340;
  const key = `palette:${input.scheme}:${String(input.reverse)}:${input.paperTheme}:${String(width)}x${String(height)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const spec = gg(armadaTonnage, aes({ x: "squadron", y: "tons", fill: "squadron" }))
    .geomCol({ width: 0.75 })
    .scales({
      fill: { type: "ordinal", scheme: input.scheme, reverse: input.reverse },
    })
    .guides({ fill: { type: "none" } })
    .theme(input.paperTheme)
    .labs({
      title: "Spanish Armada squadron tonnage, 1588",
      x: "Squadron",
      y: "Tons",
    })
    .spec();
  const svg = namespaceSvgIds(renderToSVGString(spec, { width, height }), key);
  cache.set(key, svg);
  return svg;
}

// Keep MONTH_BREAKS referenced so static temps stay aligned with live chart.
void MONTH_BREAKS;

/** Sequential Macdonell raster — static shell before SequentialColorLabLive hydrates. */
export function sequentialRasterStaticSvg(input: {
  readonly label: string;
  readonly scale: import("@ggsvelte/spec").ColorScaleSpec;
  readonly width?: number;
  readonly height?: number;
}): string {
  const width = input.width ?? DOCS_STATIC_PLOT_WIDTH_PX;
  const height = input.height ?? 360;
  const key = `seq:${input.label}:${JSON.stringify(input.scale)}:${String(width)}x${String(height)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const spec = gg(grid, aes({ x: "x", y: "y", fill: "z" }))
    .geomRaster()
    .scales({ fill: input.scale })
    .theme("light")
    .labs({
      title: `${input.label} Macdonell counts`,
      x: "Finger index",
      y: "Height index",
      fill: "Men",
    })
    .spec();
  const svg = namespaceSvgIds(renderToSVGString(spec, { width, height }), key);
  cache.set(key, svg);
  return svg;
}

export function homeHeroStaticSvgFromData(
  rows: readonly Record<string, unknown>[],
  input?: {
    readonly theme?: ThemeName;
    readonly width?: number;
    readonly height?: number;
  },
): string {
  const theme = input?.theme ?? "default";
  const width = input?.width ?? DOCS_STATIC_PLOT_WIDTH_PX;
  const height = input?.height ?? 400;
  const key = `home-hero:${theme}:${String(width)}x${String(height)}:${String(rows.length)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const spec = gg(rows as AuthoringRows, aes({ x: "literacy", y: "crimePersons", color: "region" }))
    .geomPoint({ size: 4, alpha: 0.85 })
    .scales({ color: { type: "ordinal", scheme: "tableau10" } })
    .theme(theme)
    .labs({
      title: "Literacy and crime in France, 1833",
      subtitle: "85 French departments — higher y means fewer crimes per head",
      x: "Literate conscripts (%)",
      y: "Population per crime against persons",
      color: "Region",
    })
    .spec();
  const svg = namespaceSvgIds(renderToSVGString(spec, { width, height }), key);
  cache.set(key, svg);
  return svg;
}

/**
 * Homepage grammar-demo shell: full palmerPenguins scatter + loess, default
 * interaction step (color + smooth). Static only — no inspect/legendFocus.
 * Matches GrammarDemoPlot at active step 3 (Interaction).
 */
export function homeGrammarStaticSvgFromData(
  rows: readonly Record<string, unknown>[],
  input?: {
    readonly theme?: ThemeName;
    readonly width?: number;
    readonly height?: number;
  },
): string {
  const theme = input?.theme ?? "default";
  const width = input?.width ?? DOCS_STATIC_PLOT_WIDTH_PX;
  const height = input?.height ?? 400;
  const key = `home-grammar:${theme}:${String(width)}x${String(height)}:${String(rows.length)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const spec = gg(
    rows as AuthoringRows,
    aes({ x: "flipperLengthMm", y: "bodyMassG", color: "species" }),
  )
    .geomJitter({ alpha: 0.88 })
    .geomSmooth({ method: "loess", span: 0.75, degree: 1, se: false })
    .theme(theme)
    .labs({
      x: "Flipper length mm",
      y: "Body mass g",
      color: "species",
    })
    .spec();
  const svg = namespaceSvgIds(renderToSVGString(spec, { width, height }), key);
  cache.set(key, svg);
  return svg;
}
