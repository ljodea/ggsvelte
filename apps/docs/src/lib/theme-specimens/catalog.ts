import type { ThemeName } from "@ggsvelte/spec";
import { CATEGORICAL_SCHEME_NAMES } from "@ggsvelte/spec";

import { THEME_OPTIONS } from "$lib/catalog/themes";

export type SchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

/**
 * Specimen chart kinds. Each maps to a real example corpus + geom stack that
 * showcases the theme's furniture personality (panel, grid, axes, type).
 */
export type ThemeSpecimenKind =
  | "temps-line"
  | "ridership-line"
  | "attendees-dodge"
  | "generation-area"
  | "long-run-line"
  | "penguins-scatter"
  | "countries-scatter"
  | "revenue-cols"
  | "cities-labels";

export type ThemeSpecimenConfig = {
  readonly name: ThemeName;
  readonly label: string;
  readonly caption: string;
  readonly kind: ThemeSpecimenKind;
  readonly scheme: SchemeName;
  /** Discrete color/fill legend present — enable legendFocus. */
  readonly legendFocus: boolean;
};

const BY_NAME = Object.fromEntries(THEME_OPTIONS.map((theme) => [theme.name, theme])) as Record<
  ThemeName,
  (typeof THEME_OPTIONS)[number]
>;

/** Full-width theme portrait rows, catalog order (default → tufte). */
export const THEME_SPECIMENS: readonly ThemeSpecimenConfig[] = [
  {
    name: "default",
    label: BY_NAME.default.label,
    caption: "Hairline grids, no heavy frame — multi-series default hierarchy.",
    kind: "temps-line",
    scheme: BY_NAME.default.scheme,
    legendFocus: true,
  },
  {
    name: "light",
    label: BY_NAME.light.label,
    caption: "Fine ticks and a light panel border around categorical groups.",
    kind: "attendees-dodge",
    scheme: BY_NAME.light.scheme,
    legendFocus: true,
  },
  {
    name: "dark",
    label: BY_NAME.dark.label,
    caption: "Low-glare dark paper; large fills carry the series.",
    kind: "generation-area",
    scheme: BY_NAME.dark.scheme,
    legendFocus: true,
  },
  {
    name: "minimal",
    label: BY_NAME.minimal.label,
    caption: "Quiet grid and reduced type hierarchy on a single series.",
    kind: "long-run-line",
    scheme: BY_NAME.minimal.scheme,
    legendFocus: false,
  },
  {
    name: "ggplot2",
    label: BY_NAME.ggplot2.label,
    caption: "Gray panel and white grid — the classic R silhouette.",
    kind: "penguins-scatter",
    scheme: BY_NAME.ggplot2.scheme,
    legendFocus: true,
  },
  {
    name: "classic",
    label: BY_NAME.classic.label,
    caption: "Black axes and ticks, no grid — framed research scatter.",
    kind: "countries-scatter",
    scheme: BY_NAME.classic.scheme,
    legendFocus: true,
  },
  {
    name: "hrbr",
    label: BY_NAME.hrbr.label,
    caption: "Same quiet hierarchy as default; ipsum series colors.",
    kind: "ridership-line",
    scheme: BY_NAME.hrbr.scheme,
    legendFocus: true,
  },
  {
    name: "few",
    label: BY_NAME.few.label,
    caption: "Panel border and ticks, no grid — business comparisons.",
    kind: "attendees-dodge",
    scheme: BY_NAME.few.scheme,
    legendFocus: true,
  },
  {
    name: "clean",
    label: BY_NAME.clean.label,
    caption: "Dashed grids, axis lines, and value labels.",
    kind: "revenue-cols",
    scheme: BY_NAME.clean.scheme,
    legendFocus: false,
  },
  {
    name: "fivethirtyeight",
    label: BY_NAME.fivethirtyeight.label,
    caption: "Gray paper and white grid — editorial stacked mix.",
    kind: "generation-area",
    scheme: BY_NAME.fivethirtyeight.scheme,
    legendFocus: true,
  },
  {
    name: "economist",
    label: BY_NAME.economist.label,
    caption: "Cool blue paper and magazine multi-series strokes.",
    kind: "ridership-line",
    scheme: BY_NAME.economist.scheme,
    legendFocus: true,
  },
  {
    name: "tufte",
    label: BY_NAME.tufte.label,
    caption: "No grid; labels carry the structure.",
    kind: "cities-labels",
    scheme: BY_NAME.tufte.scheme,
    legendFocus: false,
  },
];

/** Month breaks shared by climate multi-series charts. */
export const MONTH_BREAKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Continuous z on the raster density surface is roughly 0–1.
 * Pinned domain uses a mid interval so extremes clip visibly.
 */
export const RASTER_Z_DOMAIN = [0.3, 0.7] as const;
