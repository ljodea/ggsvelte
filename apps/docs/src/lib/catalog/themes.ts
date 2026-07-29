import type { ThemeName } from "@ggsvelte/spec";

import { CATEGORICAL_SCHEMES, VIRIDIS_RAMP_10 } from "./palette-tables.js";

/**
 * Docs-local mirror of package aliases (grey/gray → ggplot2). Kept as a plain
 * object so this module never value-imports `@ggsvelte/spec` / TypeBox — that
 * barrel lands in the chart mega-chunk and was modulepreloaded on /themes.
 */
const THEME_NAME_ALIASES = {
  grey: "ggplot2",
  gray: "ggplot2",
} as const satisfies Partial<Record<ThemeName, ThemeName>>;

/** Canonical picker themes — grey/gray alias ggplot2 and stay out of the list. */
type ThemeOptionName = Exclude<ThemeName, keyof typeof THEME_NAME_ALIASES>;

/**
 * Display-only scheme aliases for the docs catalog. Both spellings stay valid
 * API scheme names (identical GREY_PALETTE_10); only the canonical row is listed.
 * US `gray` is the spelling twin of UK `grey` — not a second palette.
 */
const CATEGORICAL_SCHEME_DISPLAY_ALIASES = {
  gray: "grey",
} as const satisfies Partial<
  Record<keyof typeof CATEGORICAL_SCHEMES, keyof typeof CATEGORICAL_SCHEMES>
>;

type PaletteOptionName = Exclude<
  keyof typeof CATEGORICAL_SCHEMES,
  keyof typeof CATEGORICAL_SCHEME_DISPLAY_ALIASES
>;

const THEME_LABELS = {
  default: "Default",
  light: "Light",
  dark: "Dark",
  minimal: "Minimal",
  ggplot2: "ggplot2",
  classic: "Classic",
  bw: "B&W",
  hrbr: "HRBR",
  few: "Few",
  clean: "Clean",
  fivethirtyeight: "FiveThirtyEight",
  economist: "Economist",
  tufte: "Tufte",
  linedraw: "Linedraw",
  void: "Void",
  solarized: "Solarized",
  solarizeddark: "Solarized Dark",
  economist_white: "Economist White",
  solarized_2: "Solarized 2",
  solarized_2dark: "Solarized 2 Dark",
  wsj: "WSJ",
  gdocs: "Google Docs",
  hc: "Highcharts",
  hcdark: "Highcharts Dark",
  pander: "Pander",
  test: "Test",
} as const satisfies Record<ThemeOptionName, string>;

const PALETTE_LABELS = {
  observable10: "Observable 10",
  ipsum: "Ipsum",
  flexoki: "Flexoki",
  tableau10: "Tableau 10",
  colorblind: "Colorblind",
  economist: "Economist",
  solarized: "Solarized",
  few: "Few",
  few_light: "Few Light",
  few_dark: "Few Dark",
  fivethirtyeight: "FiveThirtyEight",
  ptol: "Paul Tol",
  canva: "Canva",
  wsj: "WSJ",
  wsj_rgby: "WSJ R/G/B/Y",
  wsj_red_green: "WSJ Red/Green",
  wsj_black_green: "WSJ Black/Green",
  wsj_dem_rep: "WSJ Dem/Rep",
  tableau20: "Tableau 20",
  tableau_colorblind: "Tableau Color Blind",
  tableau_seattle_grays: "Seattle Grays",
  tableau_traffic: "Traffic",
  tableau_miller_stone: "Miller Stone",
  tableau_superfishel_stone: "Superfishel Stone",
  tableau_nuriel_stone: "Nuriel Stone",
  tableau_jewel_bright: "Jewel Bright",
  tableau_summer: "Summer",
  tableau_winter: "Winter",
  tableau_green_orange_teal: "Green/Orange/Teal",
  tableau_red_blue_brown: "Red/Blue/Brown",
  tableau_purple_pink_gray: "Purple/Pink/Gray",
  tableau_hue_circle: "Hue Circle",
  gdocs: "Google Docs",
  hc: "Highcharts",
  hc_dark: "Highcharts Dark",
  pander: "Pander",
  hue: "Hue",
  // Also scheme "gray" (US spelling) — same ramp; filtered via DISPLAY_ALIASES.
  grey: "Grey",
  // ColorBrewer qualitative (#825) — keep the upstream palette names.
  Set1: "Set1",
  Set2: "Set2",
  Set3: "Set3",
  Dark2: "Dark2",
  Paired: "Paired",
  Accent: "Accent",
} as const satisfies Record<PaletteOptionName, string>;

/** Categorical scheme paired with each theme demo so paper + marks read as a set. */
const THEME_DEMO_SCHEMES = {
  default: "observable10",
  light: "tableau10",
  dark: "flexoki",
  minimal: "colorblind",
  ggplot2: "observable10",
  classic: "tableau10",
  bw: "tableau10",
  hrbr: "ipsum",
  few: "few",
  clean: "flexoki",
  fivethirtyeight: "fivethirtyeight",
  economist: "economist",
  tufte: "colorblind",
  linedraw: "colorblind",
  void: "colorblind",
  solarized: "solarized",
  solarizeddark: "solarized",
  economist_white: "economist",
  solarized_2: "tableau10",
  solarized_2dark: "tableau10",
  wsj: "wsj",
  gdocs: "gdocs",
  hc: "hc",
  hcdark: "hc_dark",
  pander: "pander",
  test: "colorblind",
} as const satisfies Record<ThemeOptionName, keyof typeof CATEGORICAL_SCHEMES>;

/**
 * Picker/specimen themes only. Built from THEME_LABELS (not THEME_NAMES from
 * `@ggsvelte/spec`) so the client never loads the TypeBox schema graph.
 */
export const THEME_OPTIONS = (Object.keys(THEME_LABELS) as ThemeOptionName[]).map((name) => ({
  name,
  label: THEME_LABELS[name],
  scheme: THEME_DEMO_SCHEMES[name],
}));

/** Picker/specimen palettes only — API still accepts gray via the same GREY_PALETTE_10. */
export const CATEGORICAL_PALETTES = (
  Object.keys(CATEGORICAL_SCHEMES) as (keyof typeof CATEGORICAL_SCHEMES)[]
)
  .filter((name): name is PaletteOptionName => !(name in CATEGORICAL_SCHEME_DISPLAY_ALIASES))
  .map((name) => {
    const colors = CATEGORICAL_SCHEMES[name];
    return {
      name,
      label: PALETTE_LABELS[name],
      capacity: colors.length,
      colors,
    };
  });

export const VIRIDIS_COLORS = VIRIDIS_RAMP_10;
