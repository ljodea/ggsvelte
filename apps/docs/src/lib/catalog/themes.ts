import { CATEGORICAL_SCHEMES, VIRIDIS_RAMP_10 } from "@ggsvelte/core";
import { CATEGORICAL_SCHEME_NAMES, THEME_NAMES, type ThemeName } from "@ggsvelte/spec";

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
  // Aliases of the ggplot2 grey-panel look (theme_grey / theme_gray, #824).
  grey: "Grey",
  gray: "Gray",
  test: "Test",
} as const satisfies Record<ThemeName, string>;

const PALETTE_LABELS = {
  observable10: "Observable 10",
  ipsum: "Ipsum",
  flexoki: "Flexoki",
  tableau10: "Tableau 10",
  colorblind: "Colorblind",
  economist: "Economist",
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
  economist: "economist",
  tufte: "colorblind",
  linedraw: "colorblind",
  void: "colorblind",
  grey: "observable10",
  gray: "observable10",
  test: "colorblind",
} as const satisfies Record<ThemeName, (typeof CATEGORICAL_SCHEME_NAMES)[number]>;

export const THEME_OPTIONS = THEME_NAMES.map((name) => ({
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
