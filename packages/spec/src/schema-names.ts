/**
 * Named registries shared by the TypeBox schema graph and runtime catalogs.
 * Kept separate from the `$defs` object so scale/theme name lists can change
 * without editing the full declarations bag.
 */

/**
 * Hard cap on a binned position scale's bins (automatic or explicit). This is
 * the single shared source of truth: the TypeBox `breaks` `maxItems` below,
 * the core runtime boundary resolver, and the `binned-scale-break-limit`
 * pipeline error all key off it. `n` boundaries produce `n − 1` bins, so the
 * schema allows at most `MAX_BINNED_BREAKS + 1` break values.
 */
export const MAX_BINNED_BREAKS = 64;

/** Maximum gradient color stops in a portable paint (closed, bounded). */
export const MAX_PAINT_STOPS = 16;

/** Maximum glow blur radius in CSS px (bounded filter work). */
export const MAX_GLOW_RADIUS = 32;

/** Named categorical color schemes known to this schema version. */
export const CATEGORICAL_SCHEME_NAMES = [
  "observable10",
  "ipsum",
  "flexoki",
  "tableau10",
  "colorblind",
  // ggthemes ports (#1159): Stata schemes
  "stata",
  "stata_s1color",
  "stata_s1rcolor",
  "stata_mono",
  /** ggthemes scale_colour/fill_economist — Economist blues/greens (fill order). */
  "economist",
  /** ggthemes scale_colour/fill_solarized — Solarized accents, blue first. */
  "solarized",
  // ggthemes ports (#1159): Few "Show Me the Numbers" variants + FiveThirtyEight
  "few",
  "few_light",
  "few_dark",
  "fivethirtyeight",
  // ggthemes ports (#1159): Paul Tol + Canva default
  "ptol",
  "canva",
  /** ggthemes wsj_pal — scale_colour/fill_wsj palette variants. */
  "wsj",
  "wsj_rgby",
  "wsj_red_green",
  "wsj_black_green",
  "wsj_dem_rep",
  // ggthemes tableau_color_pal regular variants (#1159); Tableau 10 above is
  // the default — these complete the set.
  "tableau20",
  "tableau_colorblind",
  "tableau_seattle_grays",
  "tableau_traffic",
  "tableau_miller_stone",
  "tableau_superfishel_stone",
  "tableau_nuriel_stone",
  "tableau_jewel_bright",
  "tableau_summer",
  "tableau_winter",
  "tableau_green_orange_teal",
  "tableau_red_blue_brown",
  "tableau_purple_pink_gray",
  "tableau_hue_circle",
  // ggthemes ports (#1159): Google Docs + Highcharts + pander
  "gdocs",
  "hc",
  "hc_dark",
  "pander",
  // ggthemes ports (#1159): LibreOffice Calc + Excel 97 + current Office
  "calc",
  "excel",
  "excel_fill",
  "excel_new",
  // ColorBrewer qualitative (#825)
  "Set1",
  "Set2",
  "Set3",
  "Dark2",
  "Paired",
  "Accent",
  /** Even HSL hues — ggplot2-shaped scale_*_hue default discrete path (#829). */
  "hue",
  /** Greyscale discrete — scale_*_grey / scale_*_gray (#829). */
  "grey",
  "gray",
] as const;

/**
 * Named sequential color schemes known to this schema version.
 * Viridis family maps (matplotlib/CC0 samples + Google turbo) plus the
 * ColorBrewer sequential and diverging ramps (#825); used by continuous/binned
 * color scales and by scale_*_viridis_* discrete sampling.
 */
export const SEQUENTIAL_SCHEME_NAMES = [
  "viridis",
  "magma",
  "plasma",
  "inferno",
  "cividis",
  "turbo",
  // ColorBrewer sequential + diverging ramps (#825)
  "Blues",
  "Greens",
  "Reds",
  "Oranges",
  "Purples",
  "Greys",
  "YlOrRd",
  "YlGnBu",
  "BuPu",
  "RdYlBu",
  "RdBu",
  "BrBG",
  "Spectral",
  "PuOr",
  // ggthemes tableau_gradient_pal ordered-sequential ramps (#1159)
  "tableau_seq_blue_green",
  "tableau_seq_blue_light",
  "tableau_seq_orange_light",
  "tableau_seq_blue",
  "tableau_seq_orange",
  "tableau_seq_green",
  "tableau_seq_red",
  "tableau_seq_purple",
  "tableau_seq_brown",
  "tableau_seq_gray",
  "tableau_seq_gray_warm",
  "tableau_seq_blue_teal",
  "tableau_seq_orange_gold",
  "tableau_seq_green_gold",
  "tableau_seq_red_gold",
  // ggthemes tableau_gradient_pal ordered-diverging ramps (#1159)
  "tableau_div_orange_blue",
  "tableau_div_red_green",
  "tableau_div_green_blue",
  "tableau_div_red_blue",
  "tableau_div_red_black",
  "tableau_div_gold_purple",
  "tableau_div_red_green_gold",
  "tableau_div_sunset_sunrise",
  "tableau_div_orange_blue_white",
  "tableau_div_red_green_white",
  "tableau_div_green_blue_white",
  "tableau_div_red_blue_white",
  "tableau_div_red_black_white",
  "tableau_div_orange_blue_light",
  "tableau_div_temperature",
] as const;

export const COLOR_SCHEME_NAMES = [
  ...CATEGORICAL_SCHEME_NAMES,
  ...SEQUENTIAL_SCHEME_NAMES,
] as const;

/** Audited finite point symbols, ordered by default assignment priority. */
export const POINT_SHAPE_NAMES = [
  "circle",
  "triangle",
  "square",
  "diamond",
  "plus",
  "cross",
] as const;
export type PointShapeName = (typeof POINT_SHAPE_NAMES)[number];

/** Audited finite stroke patterns, ordered by default assignment priority. */
export const LINETYPE_NAMES = [
  "solid",
  "dashed",
  "dotted",
  "dotdash",
  "longdash",
  "twodash",
] as const;
export type LinetypeName = (typeof LINETYPE_NAMES)[number];

/** Built-in theme names known to this schema version. */
export const THEME_NAMES = [
  "default",
  "light",
  "dark",
  "minimal",
  "ggplot2",
  "classic",
  "bw",
  "hrbr",
  "few",
  "clean",
  "fivethirtyeight",
  "economist",
  "tufte",
  "linedraw",
  "void",
  // ggthemes theme ports (#1158): Stata family
  "stata",
  "stata_s1color",
  "stata_mono",
  // ggthemes theme_solarized: light (default) and dark (light = FALSE) variants.
  "solarized",
  "solarizeddark",
  // ggthemes theme ports (#1158)
  "economist_white",
  "solarized_2",
  "solarized_2dark",
  /** ggthemes theme_wsj (Wall Street Journal). */
  "wsj",
  "gdocs",
  "hc",
  "hcdark",
  "pander",
  "calc",
  "excel",
  "excel_new",
  // ggthemes minimalist family (#1158): theme_base / igray / map / solid
  "base",
  "igray",
  "map",
  "solid",
  "grey",
  "gray",
  // Snapshot/unit-test complete theme (#823). Last: ordered docs/VR rosters
  // append after product themes (and after name aliases).
  "test",
] as const;

type ThemeNameValue = (typeof THEME_NAMES)[number];

/**
 * Registered theme names that share another theme's token map / evidence.
 * Keys are first-class ThemeName values (PortableSpec accepts them); values
 * are the canonical theme that owns the built-in tokens and visual evidence.
 * UK `grey` and US `gray` both alias the grey-panel `ggplot2` look (#824).
 */
export const THEME_NAME_ALIASES = {
  grey: "ggplot2",
  gray: "ggplot2",
} as const satisfies Partial<Record<ThemeNameValue, ThemeNameValue>>;
