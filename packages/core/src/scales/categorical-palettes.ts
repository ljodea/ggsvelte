/**
 * Named categorical color palettes and scheme registry for ordinal color
 * scales. Pure data — training lives in train.ts.
 */
// Palettes live in @ggsvelte/spec (authoring + portable schemes). Core only
// consumes the frozen 10-stop tables for CATEGORICAL_SCHEMES — do not re-export
// builders here (knip: unused package exports).
import { GREY_PALETTE_10, HUE_PALETTE_10 } from "@ggsvelte/spec";

import { COLORBREWER_QUALITATIVE } from "./colorbrewer-palettes.js";

/**
 * Default categorical palette: 10 colors in the Observable 10 family.
 * The palette is a plain value — its fingerprint (not its identity) keys
 * scale-state invalidation.
 */
export const CATEGORICAL_PALETTE_10: readonly string[] = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e",
  "#9498a0",
];

/** hrbrthemes::ipsum_palette, in its published source order. */
export const IPSUM_PALETTE: readonly string[] = [
  "#d18975",
  "#8fd175",
  "#3f2d54",
  "#75b8d1",
  "#2d543d",
  "#c9d175",
  "#d1ab75",
  "#d175b8",
  "#758bd1",
];

/** hrbrthemes::flexoki_light, the light-background qualitative palette. */
export const FLEXOKI_PALETTE: readonly string[] = [
  "#D14D41",
  "#DA702C",
  "#D0A215",
  "#879A39",
  "#3AA99F",
  "#4385BE",
  "#8B7EC8",
  "#CE5D97",
];

/** ggthemes' regular "Tableau 10" palette. */
export const TABLEAU10_PALETTE: readonly string[] = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
];

/** ggthemes' eight-color qualitative colorblind-safe palette. */
export const COLORBLIND_PALETTE: readonly string[] = [
  "#000000",
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

/**
 * ggthemes gdocs_pal() — Google Docs chart colors: the six brand hues in
 * four decreasing strengths. Copied verbatim from the upstream YAML,
 * including its duplicated "teal 2" entry (#ff994d); the doc comment
 * upstream claims 20 colors but the table holds 24.
 */
export const GDOCS_PALETTE: readonly string[] = [
  "#4285f4",
  "#ea4335",
  "#fbbc04",
  "#34a853",
  "#ff6d01",
  "#46bdc6",
  "#7baaf7",
  "#f07b72",
  "#fcd04f",
  "#71c287",
  "#ff994d",
  "#ff994d",
  "#b3cefb",
  "#f7b4ae",
  "#fde49b",
  "#aedcba",
  "#ffc599",
  "#c9e4e7",
  "#ecf3fe",
  "#fdeceb",
  "#fff8e6",
  "#ebf6ee",
  "#fff0e6",
  "#edf8f9",
];

/** ggthemes hc_pal("default") — Highcharts default 10 colors. */
export const HC_PALETTE: readonly string[] = [
  "#7cb5ec",
  "#434348",
  "#90ed7d",
  "#f7a35c",
  "#8085e9",
  "#f15c80",
  "#e4d354",
  "#8085e8",
  "#8d4653",
  "#91e8e1",
];

/** ggthemes hc_pal("darkunica") — Highcharts dark-unica 11 colors (verbatim, with its trailing repeats). */
export const HC_DARK_PALETTE: readonly string[] = [
  "#2b908f",
  "#90ee7e",
  "#f45b5b",
  "#7798BF",
  "#aaeeee",
  "#ff0066",
  "#eeaaee",
  "#55BF3B",
  "#DF5353",
  "#7798BF",
  "#aaeeee",
];

/**
 * ggthemes palette_pander() — the pander package's colorblind- and
 * printer-friendly eight (borrowed from jfly.iam.u-tokyo.ac.jp/color):
 * the Okabe-Ito hues in pander's order, with #999999 in place of black.
 */
export const PANDER_PALETTE: readonly string[] = [
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
  "#999999",
  "#E69F00",
];

/** Named categorical schemes accepted by the portable spec. */
export const CATEGORICAL_SCHEMES = {
  observable10: CATEGORICAL_PALETTE_10,
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
  gdocs: GDOCS_PALETTE,
  hc: HC_PALETTE,
  hc_dark: HC_DARK_PALETTE,
  pander: PANDER_PALETTE,
  ...COLORBREWER_QUALITATIVE,
  hue: HUE_PALETTE_10,
  grey: GREY_PALETTE_10,
  gray: GREY_PALETTE_10,
} as const satisfies Readonly<Record<string, readonly string[]>>;
