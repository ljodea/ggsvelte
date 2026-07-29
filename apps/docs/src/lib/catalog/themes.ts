import { CATEGORICAL_SCHEMES, VIRIDIS_RAMP_10 } from "@ggsvelte/core";
import {
  CATEGORICAL_SCHEME_NAMES,
  THEME_NAME_ALIASES,
  THEME_NAMES,
  type ThemeName,
} from "@ggsvelte/spec";

/** Canonical picker themes — grey/gray alias ggplot2 and stay out of the list. */
type ThemeOptionName = Exclude<ThemeName, keyof typeof THEME_NAME_ALIASES>;

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
  test: "Test",
} as const satisfies Record<ThemeOptionName, string>;

const PALETTE_LABELS = {
  observable10: "Observable 10",
  ipsum: "Ipsum",
  flexoki: "Flexoki",
  tableau10: "Tableau 10",
  colorblind: "Colorblind",
  solarized: "Solarized",
  hue: "Hue",
  grey: "Grey",
  gray: "Gray",
  // ColorBrewer qualitative (#825) — keep the upstream palette names.
  Set1: "Set1",
  Set2: "Set2",
  Set3: "Set3",
  Dark2: "Dark2",
  Paired: "Paired",
  Accent: "Accent",
} as const satisfies Record<(typeof CATEGORICAL_SCHEME_NAMES)[number], string>;

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
  few: "tableau10",
  clean: "flexoki",
  fivethirtyeight: "tableau10",
  economist: "flexoki",
  tufte: "colorblind",
  linedraw: "colorblind",
  void: "colorblind",
  solarized: "solarized",
  solarizeddark: "solarized",
  test: "colorblind",
} as const satisfies Record<ThemeOptionName, (typeof CATEGORICAL_SCHEME_NAMES)[number]>;

/** Picker/specimen themes only — API still accepts grey/gray via THEME_NAME_ALIASES. */
export const THEME_OPTIONS = THEME_NAMES.filter(
  (name): name is ThemeOptionName => !(name in THEME_NAME_ALIASES),
).map((name) => ({
  name,
  label: THEME_LABELS[name],
  scheme: THEME_DEMO_SCHEMES[name],
}));

export const CATEGORICAL_PALETTES = CATEGORICAL_SCHEME_NAMES.map((name) => {
  const colors = CATEGORICAL_SCHEMES[name];
  return {
    name,
    label: PALETTE_LABELS[name],
    capacity: colors.length,
    colors,
  };
});

export const VIRIDIS_COLORS = VIRIDIS_RAMP_10;
