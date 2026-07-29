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

/** ggthemes stata_pal("s2color") — the default Stata s2color scheme's 15 colors. */
export const STATA_PALETTE: readonly string[] = [
  "#1a476f",
  "#90353b",
  "#55752f",
  "#e37e00",
  "#6e8e84",
  "#c10534",
  "#938dd2",
  "#cac27e",
  "#a0522d",
  "#7b92a8",
  "#2d6d66",
  "#9c8847",
  "#bfa19c",
  "#ffd200",
  "#d9e6eb",
];

/** ggthemes stata_pal("s1color") — the Stata s1color scheme's 15 colors. */
export const STATA_S1COLOR_PALETTE: readonly string[] = [
  "#006000",
  "#ff4500",
  "#1a476f",
  "#90353b",
  "#6e8e84",
  "#a0522d",
  "#ff7f00",
  "#ff00ff",
  "#00ffff",
  "#ff0000",
  "#00ff00",
  "#9c8847",
  "#800080",
  "#c0dcc0",
  "#add8e6",
];

/** ggthemes stata_pal("s1rcolor") — the Stata s1rcolor (dark-background) scheme's 15 colors. */
export const STATA_S1RCOLOR_PALETTE: readonly string[] = [
  "#ffff00",
  "#00ff00",
  "#0080ff",
  "#ff00ff",
  "#ff7f00",
  "#ff0000",
  "#add8e6",
  "#ffe474",
  "#00ff80",
  "#c0dcc0",
  "#ff4500",
  "#0000ff",
  "#ff0080",
  "#6e8e84",
  "#a0522d",
];

/** ggthemes stata_pal("mono") — the Stata monochrome scheme's 15 grays. */
export const STATA_MONO_PALETTE: readonly string[] = [
  "#606060",
  "#a0a0a0",
  "#808080",
  "#404040",
  "#000000",
  "#e0e0e0",
  "#202020",
  "#707070",
  "#909090",
  "#b0b0b0",
  "#d0d0d0",
  "#f0f0f0",
  "#303030",
  "#c0c0c0",
  "#505050",
];

/** Named categorical schemes accepted by the portable spec. */
export const CATEGORICAL_SCHEMES = {
  observable10: CATEGORICAL_PALETTE_10,
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
  stata: STATA_PALETTE,
  stata_s1color: STATA_S1COLOR_PALETTE,
  stata_s1rcolor: STATA_S1RCOLOR_PALETTE,
  stata_mono: STATA_MONO_PALETTE,
  ...COLORBREWER_QUALITATIVE,
  hue: HUE_PALETTE_10,
  grey: GREY_PALETTE_10,
  gray: GREY_PALETTE_10,
} as const satisfies Readonly<Record<string, readonly string[]>>;
