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
 * ggthemes economist_pal(fill = TRUE) at full capacity (n = 9 selection):
 * blue-gray, dark blue, blue, light blue, dark green, light green, dark red,
 * pink, gray. ggthemes re-selects per n; this port flattens to the fixed
 * full-capacity order (prefix subsets approximate the smaller-n picks).
 */
export const ECONOMIST_PALETTE: readonly string[] = [
  "#6794a7",
  "#014d64",
  "#01a2d9",
  "#7ad2f6",
  "#00887d",
  "#76c0c1",
  "#7c260b",
  "#ee8f71",
  "#adadad",
];

/**
 * ggthemes solarized_pal(accent = "blue") at full capacity: the eight
 * Solarized accents with the default blue first, then the remaining accents
 * in source order (ggthemes' max-L*a*b-distance pick is order-degenerate at
 * n = 8 and falls back to source order). ggthemes re-selects per n; this
 * port flattens to the fixed n = 8 order, so prefix subsets approximate the
 * smaller-n picks. The same accents serve light and dark panels — only the
 * base tones flip between the solarized/solarizeddark themes.
 */
export const SOLARIZED_PALETTE: readonly string[] = [
  "#268bd2",
  "#b58900",
  "#cb4b16",
  "#dc322f",
  "#d33682",
  "#6c71c4",
  "#2aa198",
  "#859900",
];

/**
 * ggthemes few_pal("Medium") — Stephen Few's medium-strength qualitative
 * palette (scale_colour_few default). ggthemes reserves its first value
 * (Gray) for non-data parts at n = 1; the data colors are the remaining
 * eight, and its n picks are prefix walks, so this fixed list is exactly
 * the ggthemes full-capacity order.
 */
export const FEW_PALETTE: readonly string[] = [
  "#5DA5DA",
  "#FAA43A",
  "#60BD68",
  "#F17CB0",
  "#B2912F",
  "#B276B2",
  "#DECF3F",
  "#F15854",
];

/** ggthemes few_pal("Light") — Few's light variant for filled areas (scale_fill_few default). */
export const FEW_LIGHT_PALETTE: readonly string[] = [
  "#88BDE6",
  "#FBB258",
  "#90CD97",
  "#F6AAC9",
  "#BFA554",
  "#BC99C7",
  "#EDDD46",
  "#F07E6E",
];

/** ggthemes few_pal("Dark") — Few's dark variant for thin lines / highlighting. */
export const FEW_DARK_PALETTE: readonly string[] = [
  "#265DAB",
  "#DF5C24",
  "#059748",
  "#E5126F",
  "#9D722A",
  "#7B3A96",
  "#C7B42E",
  "#CB2027",
];

/** ggthemes fivethirtyeight_pal() — the standard three-color 538 line palette: blue, red, green. */
export const FIVETHIRTYEIGHT_PALETTE: readonly string[] = ["#008FD5", "#FF2700", "#77AB43"];

/**
 * ggthemes ptol_pal() at full capacity (n = 12 selection) — Paul Tol's
 * qualitative palette (SRON/EPS/TN/09-002). ggthemes re-selects the set per
 * n; this port flattens to the fixed full-capacity order (prefix subsets
 * approximate the smaller-n picks), as with the economist palette.
 */
export const PTOL_PALETTE: readonly string[] = [
  "#332288",
  "#6699CC",
  "#88CCEE",
  "#44AA99",
  "#117733",
  "#999933",
  "#DDCC77",
  "#661100",
  "#CC6677",
  "#AA4466",
  "#882255",
  "#AA4499",
];

/**
 * ggthemes canva_pal("Fresh and bright") — the scale_*_canva default.
 * ggthemes ships 150 named four-color Canva palettes; only the default is
 * registered (documented subset).
 */
export const CANVA_PALETTE: readonly string[] = ["#f98866", "#ff420e", "#80bd9e", "#89da59"];

/** Named categorical schemes accepted by the portable spec. */
export const CATEGORICAL_SCHEMES = {
  observable10: CATEGORICAL_PALETTE_10,
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
  economist: ECONOMIST_PALETTE,
  solarized: SOLARIZED_PALETTE,
  few: FEW_PALETTE,
  few_light: FEW_LIGHT_PALETTE,
  few_dark: FEW_DARK_PALETTE,
  fivethirtyeight: FIVETHIRTYEIGHT_PALETTE,
  ptol: PTOL_PALETTE,
  canva: CANVA_PALETTE,
  ...COLORBREWER_QUALITATIVE,
  hue: HUE_PALETTE_10,
  grey: GREY_PALETTE_10,
  gray: GREY_PALETTE_10,
} as const satisfies Readonly<Record<string, readonly string[]>>;
