/**
 * Built-in theme tables and token construction.
 *
 * Holds ThemeTokens, the frozen BUILTIN_THEMES / LEGACY_BUILTIN_THEMES
 * registries, and the themed() constructor used both to build those tables
 * and by resolveTheme() for object overrides. Resolution API lives in theme.ts.
 */
import type { ThemeName } from "@ggsvelte/spec";

/** Resolved theme role tokens (CSS colors; "currentColor"/"none" allowed). */
export interface ThemeTokens {
  /** Foreground: axis lines, tick labels, titles, unmapped stroke-ish marks. */
  ink: string;
  /** Background painted behind the whole plot ("none" = transparent). */
  paper: string;
  /** Default fill for unmapped bars / columns / areas. */
  accent: string;
  /** Panel grid lines. */
  grid: string;
  /** Panel background (separate from the plot-wide paper). */
  panel: string;
  /** Fixed-aspect gutter fill (defaults to paper). */
  letterboxFill: string;
  /** Axis tick-label color. */
  axisText: string;
  /** Axis baseline color. */
  axisLine: string;
  /** Tick-mark color. */
  tickColor: string;
  /** Panel-border color. */
  panelBorder: string;
  /** Primary ink for interaction controls and overlays. */
  interactionInk: string;
  /** Opacity applied to marks de-emphasized by an interaction. */
  interactionMuted: number;
  /** Keyboard-focus and active-mark halo color. */
  focusRing: string;
  /** Crosshair guide color. */
  crosshair: string;
  /** Translucent interval-selection fill. */
  selectionFill: string;
  /** Interval-selection and zoom-target stroke. */
  selectionStroke: string;
  /** Opaque tooltip surface. */
  tooltipPaper: string;
  /** Tooltip foreground. */
  tooltipInk: string;
  /** Tooltip keyline. */
  tooltipBorder: string;
  /** Active tool text and underline. */
  toolActive: string;
  /** Explicit chart typeface stack. */
  fontFamily: string;
  fontSize: number;
  axisTextSize: number;
  fontWeight: number;
  titleSize: number;
  titleWeight: number;
  subtitleSize: number;
  subtitleWeight: number;
  axisTitleSize: number;
  axisTitleWeight: number;
  guideTitleSize: number;
  legendKeySize: number;
  legendKeyGap: number;
  legendRowGap: number;
  guideBlockGap: number;
  colorbarThickness: number;
  colorbarLengthMin: number;
  captionSize: number;
  stripSize: number;
  stripWeight: number;
  axisLineWidth: number;
  tickWidth: number;
  tickLength: number;
  gridWidth: number;
  panelBorderWidth: number;
  gridDasharray: string;
  axisLineX: boolean;
  axisLineY: boolean;
  ticksX: boolean;
  ticksY: boolean;
  /** When false, axis tick labels are suppressed (theme_void). Default true. */
  labelsX: boolean;
  labelsY: boolean;
  gridX: boolean;
  gridY: boolean;
  showPanelBorder: boolean;
}

const ROBOTO_CONDENSED = '"Roboto Condensed", "Arial Narrow", Arial, sans-serif';

type FoundationThemeTokens = Omit<
  ThemeTokens,
  | "interactionInk"
  | "interactionMuted"
  | "focusRing"
  | "crosshair"
  | "selectionFill"
  | "selectionStroke"
  | "tooltipPaper"
  | "tooltipInk"
  | "tooltipBorder"
  | "toolActive"
  | "letterboxFill"
>;

const HRBR_BASE: FoundationThemeTokens = {
  ink: "#262626",
  paper: "#ffffff",
  accent: "#4385be",
  grid: "#cccccc",
  panel: "#ffffff",
  axisText: "#4d4d4d",
  axisLine: "#cccccc",
  tickColor: "#cccccc",
  panelBorder: "#cccccc",
  fontFamily: ROBOTO_CONDENSED,
  fontSize: 11.5,
  axisTextSize: 11.5,
  fontWeight: 300,
  titleSize: 18,
  titleWeight: 700,
  subtitleSize: 13,
  subtitleWeight: 300,
  // Axis titles sit next to tick labels; keep them at least as large (#753).
  axisTitleSize: 11.5,
  axisTitleWeight: 400,
  guideTitleSize: 11,
  legendKeySize: 10,
  legendKeyGap: 6,
  legendRowGap: 0,
  guideBlockGap: 12,
  colorbarThickness: 12,
  colorbarLengthMin: 180,
  captionSize: 9,
  stripSize: 12,
  stripWeight: 400,
  axisLineWidth: 0.2,
  tickWidth: 0.2,
  tickLength: 5,
  gridWidth: 0.4,
  panelBorderWidth: 0.5,
  gridDasharray: "",
  axisLineX: false,
  axisLineY: false,
  ticksX: false,
  ticksY: false,
  labelsX: true,
  labelsY: true,
  gridX: true,
  gridY: true,
  showPanelBorder: false,
};

function translucent(color: string, alpha: number): string {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (hex !== null) {
    return `rgba(${Number.parseInt(hex[1]!, 16)}, ${Number.parseInt(hex[2]!, 16)}, ${Number.parseInt(hex[3]!, 16)}, ${alpha})`;
  }
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
}

/**
 * Interaction colors are relationships, not a second palette. Keeping the
 * derivation here means every built-in and edition-specific theme gets a
 * coherent interaction treatment when its foundational roles change.
 */
export function themed(
  overrides: Partial<FoundationThemeTokens> & { letterboxFill?: string },
): ThemeTokens {
  const { letterboxFill, ...foundationOverrides } = overrides;
  const foundation = { ...HRBR_BASE, ...foundationOverrides };
  const hasOpaqueSurface = foundation.paper !== "none" || foundation.panel !== "none";
  const tooltipPaper =
    foundation.paper === "none"
      ? foundation.panel === "none"
        ? "#ffffff"
        : foundation.panel
      : foundation.paper;
  const tooltipInk = hasOpaqueSurface
    ? foundation.ink
    : foundation.ink === "currentColor"
      ? "#1f2328"
      : foundation.ink;
  // Flat tooltip chrome only when the theme also draws no frame (#1069).
  // Tufte/void: grid none, no panel border, no axis lines → transparent keyline.
  // few/classic: grid none but framed (panel border or axis lines) → keep
  // panelBorder so boxed themes do not lose their tooltip outline + pin hint.
  const flatTooltipChrome =
    foundation.grid === "none" &&
    !foundation.showPanelBorder &&
    !foundation.axisLineX &&
    !foundation.axisLineY;
  const tooltipBorder = flatTooltipChrome
    ? "transparent"
    : foundation.grid === "none"
      ? foundation.panelBorder
      : foundation.grid;
  return Object.freeze({
    ...foundation,
    letterboxFill: letterboxFill ?? foundation.paper,
    interactionInk: foundation.ink,
    interactionMuted: 0.36,
    focusRing: foundation.accent,
    crosshair: foundation.axisText,
    selectionFill: translucent(foundation.accent, 0.18),
    selectionStroke: foundation.accent,
    tooltipPaper,
    tooltipInk,
    tooltipBorder,
    toolActive: foundation.ink,
  });
}

/**
 * Grey-panel ggplot2 complete-theme tokens. Shared by registered names
 * `ggplot2`, `grey`, and `gray` (UK/US theme_grey / theme_gray aliases, #824).
 * LEGACY_BUILTIN_THEMES spreads BUILTIN_THEMES so the aliases inherit there too.
 */
const GGPLOT2_GREY = themed({
  ink: "#333333",
  panel: "#ebebeb",
  grid: "#ffffff",
  axisText: "#4d4d4d",
  tickColor: "#333333",
  fontSize: 11,
  axisTextSize: 12,
  fontWeight: 400,
  titleSize: 13.2,
  subtitleSize: 11,
  axisTitleSize: 11,
  captionSize: 8.8,
  stripSize: 8.8,
  tickWidth: 0.5,
  tickLength: 3.67,
  gridWidth: 0.5,
  ticksX: true,
  ticksY: true,
});

/**
 * Built-in themes for edition 2. The default deliberately follows
 * hrbrthemes' quiet hierarchy: real typography, hairline grids, and no heavy
 * axis frame. Named presets retain the structural contracts of their R
 * counterparts rather than acting as color aliases.
 */
export const BUILTIN_THEMES: Readonly<Record<ThemeName, ThemeTokens>> = Object.freeze({
  default: themed({}),
  hrbr: themed({}),
  minimal: themed({
    ink: "#333333",
    accent: "#4385be",
    grid: "#ebebeb",
    fontSize: 11,
    // Was 8.8 — unreadable next to titles/tooltips at chart size (#753).
    axisTextSize: 12,
    titleSize: 15,
    subtitleSize: 12,
    gridWidth: 0.5,
  }),
  light: themed({
    ink: "#333333",
    grid: "#dedede",
    axisText: "#4d4d4d",
    axisLine: "#b3b3b3",
    tickColor: "#b3b3b3",
    fontSize: 11,
    // Was 8.8 — homepage hero and light charts forced squinting (#753).
    // Smoke VR baselines refreshed with this token change (PR #755).
    axisTextSize: 12,
    titleSize: 15,
    subtitleSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.25,
    tickLength: 3.67,
    gridWidth: 0.25,
    ticksX: true,
    ticksY: true,
    showPanelBorder: true,
  }),
  dark: themed({
    ink: "#e6e8eb",
    paper: "#16181d",
    panel: "#16181d",
    accent: "#7ea1f0",
    grid: "#3b3f46",
    axisText: "#c6c9ce",
    axisLine: "#6b717b",
    tickColor: "#6b717b",
  }),
  ggplot2: GGPLOT2_GREY,
  // theme_grey / theme_gray name parity — same token map as ggplot2 (#824).
  grey: GGPLOT2_GREY,
  gray: GGPLOT2_GREY,
  classic: themed({
    ink: "#000000",
    grid: "none",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    fontSize: 11,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 15,
    subtitleSize: 12,
    axisTitleSize: 11,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0,
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: false,
    gridY: false,
  }),
  // theme_bw complete-theme role (#820): white panel, grey grid, rectangular
  // border for print/B&W reproduction. Distinct from ggplot2 (grey panel,
  // white grid) and light (thinner chrome, lighter border).
  bw: themed({
    ink: "#333333",
    paper: "#ffffff",
    panel: "#ffffff",
    grid: "#e5e5e5",
    axisText: "#4d4d4d",
    axisLine: "#333333",
    tickColor: "#333333",
    panelBorder: "#333333",
    fontSize: 11,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 13.2,
    subtitleSize: 11,
    axisTitleSize: 11,
    captionSize: 8.8,
    stripSize: 8.8,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    ticksX: true,
    ticksY: true,
    axisLineX: false,
    axisLineY: false,
    showPanelBorder: true,
  }),
  few: themed({
    ink: "#333333",
    accent: "#5da5da",
    grid: "none",
    axisText: "#4d4d4d",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    axisLine: "#4d4d4d",
    tickColor: "#4d4d4d",
    panelBorder: "#4d4d4d",
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3,
    gridWidth: 0,
    ticksX: true,
    ticksY: true,
    gridX: false,
    gridY: false,
    showPanelBorder: true,
  }),
  clean: themed({
    accent: "#5da5da",
    grid: "#b3b3b3",
    axisLine: "#4d4d4d",
    tickColor: "#4d4d4d",
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3,
    gridWidth: 0.4,
    gridDasharray: "1.5 2.5",
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: false,
  }),
  fivethirtyeight: themed({
    ink: "#3c3c3c",
    paper: "#f0f0f0",
    panel: "#f0f0f0",
    accent: "#008fd5",
    grid: "#ffffff",
    axisText: "#3c3c3c",
    gridWidth: 0.5,
  }),
  economist: themed({
    ink: "#014d64",
    paper: "#d5e4eb",
    panel: "#d5e4eb",
    accent: "#ed111a",
    grid: "#ffffff",
    axisText: "#014d64",
    tickColor: "#6794a7",
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    ticksX: true,
  }),
  tufte: themed({
    ink: "#111111",
    accent: "#111111",
    grid: "none",
    gridWidth: 0,
    gridX: false,
    gridY: false,
  }),
  // theme_linedraw: white panel + black grid/border/ticks (line-art / B&W print).
  // Hairline black grid (0.3) avoids solid graph paper; panel border carries the
  // frame (axisLineX/Y stay false from HRBR_BASE). Accent stays monochrome so
  // unmapped marks and focus chrome do not introduce a brand hue.
  linedraw: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#000000",
    grid: "#000000",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    panelBorder: "#000000",
    fontSize: 11,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 13.2,
    subtitleSize: 11,
    axisTitleSize: 11,
    captionSize: 8.8,
    stripSize: 8.8,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.3,
    panelBorderWidth: 0.5,
    ticksX: true,
    ticksY: true,
    showPanelBorder: true,
  }),
  // ggplot2 theme_void: no axes, grid, or panel chrome; marks (and legends) remain.
  void: themed({
    paper: "none",
    panel: "none",
    grid: "none",
    gridWidth: 0,
    gridX: false,
    gridY: false,
    axisLineX: false,
    axisLineY: false,
    ticksX: false,
    ticksY: false,
    labelsX: false,
    labelsY: false,
    showPanelBorder: false,
    tickLength: 0,
  }),
  // ggthemes theme_stata(scheme = "s2color"): the default Stata look —
  // ltbluishgray (#eaf2f3) plot region around a white panel, matching
  // ltbluishgray y-major grid (major.x and minor blank), black axis lines
  // and ticks, no panel border. Sizes from stata_gsize ratios (base 11,
  // axis 10, title 14, axis title 10). R's dknavy title colour folds into
  // the single ink role (documented), and the bottom legend position is not
  // expressible. Accent is the s2color palette's navy.
  stata: themed({
    ink: "#000000",
    paper: "#eaf2f3",
    panel: "#ffffff",
    accent: "#1a476f",
    grid: "#eaf2f3",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    fontSize: 11,
    axisTextSize: 10,
    fontWeight: 400,
    titleSize: 14,
    subtitleSize: 11,
    axisTitleSize: 10,
    captionSize: 8,
    stripSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: false,
  }),
  // ggthemes theme_stata(scheme = "s1color"): the older Stata s1 look —
  // white plot and panel, gs14 (#e0e0e0) y-grid, and Stata's black panel
  // border. Accent is the s1color palette's dkgreen.
  stata_s1color: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#006000",
    grid: "#e0e0e0",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    panelBorder: "#000000",
    fontSize: 11,
    axisTextSize: 10,
    fontWeight: 400,
    titleSize: 14,
    subtitleSize: 11,
    axisTitleSize: 10,
    captionSize: 8,
    stripSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: false,
    showPanelBorder: true,
  }),
  // ggthemes theme_stata(scheme = "s2mono"): the monochrome Stata look —
  // gs15 (#f0f0f0) plot region, dimgray (#e8e8e8 per Stata's color names)
  // y-grid, white panel, no border. Accent is the mono palette's first gray.
  stata_mono: themed({
    ink: "#000000",
    paper: "#f0f0f0",
    panel: "#ffffff",
    accent: "#606060",
    grid: "#e8e8e8",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    fontSize: 11,
    axisTextSize: 10,
    fontWeight: 400,
    titleSize: 14,
    subtitleSize: 11,
    axisTitleSize: 10,
    captionSize: 8,
    stripSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: false,
  }),
  // ggthemes theme_solarized (light = TRUE): theme_bw lineage on Schoonover's
  // light rebase — base3 panel (#fdf6e3), base2 grid, base1 chrome/text,
  // transparent plot background, blue accent. ggthemes draws the frame via
  // panel.background colour (panel.border is blank); here showPanelBorder
  // carries it. Single-ink model: R's darker title step (rebase0) flattens
  // into ink (rebase01), as with the other ports.
  solarized: themed({
    ink: "#93a1a1",
    paper: "none",
    panel: "#fdf6e3",
    accent: "#268bd2",
    grid: "#eee8d5",
    axisText: "#93a1a1",
    axisLine: "#93a1a1",
    tickColor: "#93a1a1",
    panelBorder: "#93a1a1",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    // theme_bw lineage: frame is the panel border only (axisLineX/Y stay false).
    axisLineX: false,
    axisLineY: false,
    ticksX: true,
    ticksY: true,
    showPanelBorder: true,
  }),
  // ggthemes theme_solarized (light = FALSE): same geometry on the dark
  // rebase — base03 panel (#002b36), base02 grid, base01 chrome. Accents are
  // shared across light/dark by Solarized's design (only base tones flip).
  solarizeddark: themed({
    ink: "#586e75",
    paper: "none",
    panel: "#002b36",
    accent: "#268bd2",
    grid: "#073642",
    axisText: "#586e75",
    axisLine: "#586e75",
    tickColor: "#586e75",
    panelBorder: "#586e75",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    // theme_bw lineage: frame is the panel border only (axisLineX/Y stay false).
    axisLineX: false,
    axisLineY: false,
    ticksX: true,
    ticksY: true,
    showPanelBorder: true,
  }),
  // ggthemes theme_economist_white (gray_bg = TRUE): the Graphic Detail blog
  // variant of theme_economist — white panel on a light-gray (#ebebeb) plot
  // background with a dark-gray (#c9c9c9) major grid. R builds it as
  // theme_economist() + surface overrides, so this port keeps the economist
  // chrome (ink, ticks, sizes) and swaps exactly the three surfaces.
  economist_white: themed({
    ink: "#014d64",
    paper: "#ebebeb",
    panel: "#ffffff",
    accent: "#ed111a",
    grid: "#c9c9c9",
    axisText: "#014d64",
    tickColor: "#6794a7",
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    ticksX: true,
  }),
  // ggthemes theme_solarized_2 (light = TRUE): the theme_grey-flavored
  // Solarized variant — base2 panel (#eee8d5) with base3 grid (#fdf6e3),
  // base1 chrome/text, transparent plot background. In ggthemes the axis
  // line colour reads a misspelled rebase key ("reabase01") and resolves to
  // NA, so no axis line is drawn; panel.border is blank, so no frame either.
  // Single-ink model: R's darker title step (rebase0) flattens into ink
  // (rebase01), as with the other ports.
  solarized_2: themed({
    ink: "#93a1a1",
    paper: "none",
    panel: "#eee8d5",
    accent: "#268bd2",
    grid: "#fdf6e3",
    axisText: "#93a1a1",
    tickColor: "#93a1a1",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    ticksX: true,
    ticksY: true,
  }),
  // ggthemes theme_solarized_2 (light = FALSE): same geometry on the dark
  // rebase — base02 panel (#073642), base03 grid (#002b36), base01 chrome.
  // Accents are shared across light/dark by Solarized's design.
  solarized_2dark: themed({
    ink: "#586e75",
    paper: "none",
    panel: "#073642",
    accent: "#268bd2",
    grid: "#002b36",
    axisText: "#586e75",
    tickColor: "#586e75",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    ticksX: true,
    ticksY: true,
  }),
  // ggthemes theme_wsj: Wall Street Journal chrome — "brown" paper (#f8f2e4),
  // dotted black y-grid only, x axis line and ticks, no y line/ticks, big bold
  // title (rel(2) of base 12). R's title_family = "mono" has no single-family
  // token here, so the system sans stack carries both; axis.text bold and the
  // blank axis.title also flatten into the shared roles. Accent is colors6 red
  // so unmapped marks pair with the wsj palette.
  wsj: themed({
    ink: "#000000",
    paper: "#f8f2e4",
    panel: "#f8f2e4",
    accent: "#c72e29",
    grid: "#000000",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 24,
    titleWeight: 700,
    subtitleSize: 12,
    subtitleWeight: 400,
    axisTitleSize: 12,
    axisTitleWeight: 400,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    gridDasharray: "1.5 3",
    axisLineX: true,
    ticksX: true,
    gridX: false,
  }),
  // ggthemes theme_gdocs: Google Docs chart defaults — white panel, #cccccc
  // major grid both directions (minor blank), black x-only axis line, no
  // ticks, #757575 text, plain 20px left-aligned title. Accent is Google
  // blue, the first gdocs palette color.
  gdocs: themed({
    ink: "#757575",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#4285f4",
    grid: "#cccccc",
    axisText: "#757575",
    axisLine: "#000000",
    tickColor: "#000000",
    fontSize: 12,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 20,
    titleWeight: 400,
    subtitleSize: 12,
    subtitleWeight: 400,
    axisTitleSize: 12,
    axisLineWidth: 0.5,
    gridWidth: 0.5,
    axisLineX: true,
    ticksX: false,
    ticksY: false,
  }),
  // ggthemes theme_hc(style = "default"): Highcharts defaults — #D8D8D8
  // y-only major grid, no panel border (panel background blank over white
  // rect), theme_grey-lineage ticks and axis text. Accent is the first
  // Highcharts default color.
  hc: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#7cb5ec",
    grid: "#D8D8D8",
    axisText: "#4d4d4d",
    tickColor: "#333333",
    fontSize: 12,
    axisTextSize: 9.6,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    ticksX: true,
    ticksY: true,
    gridX: false,
  }),
  // ggthemes theme_hc(style = "darkunica"): Highcharts dark theme — #2a2a2b
  // paper, #707073 y-grid, #A0A0A3 text. R leaves axis.text at theme_grey's
  // dark grey (dark-on-dark); this port uses the style's text colour for
  // axis text and ticks (documented deviation). R's white title step
  // flattens into the single ink role, as with the other ports.
  hcdark: themed({
    ink: "#A0A0A3",
    paper: "#2a2a2b",
    panel: "#2a2a2b",
    accent: "#2b908f",
    grid: "#707073",
    axisText: "#A0A0A3",
    tickColor: "#A0A0A3",
    fontSize: 12,
    axisTextSize: 9.6,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    ticksX: true,
    ticksY: true,
    gridX: false,
  }),
  // ggthemes theme_pander() with its defaults (fc black, gc grey, gl dashed,
  // boxes FALSE): white panel (pc "transparent" over white), dashed #bebebe
  // grid both directions (R "grey" is #BEBEBE), grey ticks, bold 14.4 title,
  // no visible panel border. Accent is the first pander palette color.
  pander: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#56B4E9",
    grid: "#bebebe",
    axisText: "#000000",
    tickColor: "#bebebe",
    fontSize: 12,
    axisTextSize: 9.6,
    fontWeight: 400,
    titleSize: 14.4,
    titleWeight: 700,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.25,
    tickLength: 3.67,
    gridWidth: 0.25,
    gridDasharray: "3 3",
    ticksX: true,
    ticksY: true,
  }),
  // ggthemes theme_calc: LibreOffice Calc defaults — white panel with a
  // gray70 (#b3b3b3) border, gray70 y-major grid only (major.x and minor
  // blank), no axis lines, black text, title rel(1.3) of base 10. Accent is
  // the first Calc chart color.
  calc: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#004586",
    grid: "#b3b3b3",
    axisText: "#000000",
    tickColor: "#b3b3b3",
    panelBorder: "#b3b3b3",
    fontSize: 10,
    axisTextSize: 10,
    fontWeight: 400,
    titleSize: 13,
    subtitleSize: 10,
    axisTitleSize: 10,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    ticksX: true,
    ticksY: true,
    gridX: false,
    showPanelBorder: true,
  }),
  // ggthemes theme_excel (horizontal = TRUE): the Excel 97 "classic ugly"
  // look — #c0c0c0 gray panel, black major y-grid (minor and major.x blank),
  // black panel border. Chrome follows this port's theme_bw lineage
  // (#333/#4d4d4d, as in bw). Accent is the first Excel 97 line color
  // (magenta — the palette is faithfully ironic).
  excel: themed({
    ink: "#333333",
    paper: "#ffffff",
    panel: "#c0c0c0",
    accent: "#FF00FF",
    grid: "#000000",
    axisText: "#4d4d4d",
    tickColor: "#333333",
    panelBorder: "#000000",
    fontSize: 12,
    axisTextSize: 9.6,
    fontWeight: 400,
    titleSize: 14.4,
    subtitleSize: 12,
    axisTitleSize: 12,
    tickWidth: 0.5,
    tickLength: 3.67,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    ticksX: true,
    ticksY: true,
    gridX: false,
    showPanelBorder: true,
  }),
  // ggthemes theme_excel_new: current Excel defaults — dark-gray (#595959)
  // text, hairline #bfbfbf y-major grid (0.75 pt → CSS ~0.25), no ticks, no
  // panel border, plain centered 14px title on white. R blanks the axis
  // titles; not expressible here (flattened, as with wsj). Accent is the
  // default Office theme's first accent.
  excel_new: themed({
    ink: "#595959",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#4472C4",
    grid: "#bfbfbf",
    axisText: "#595959",
    tickColor: "#bfbfbf",
    panelBorder: "#bfbfbf",
    fontSize: 9,
    axisTextSize: 9,
    fontWeight: 400,
    titleSize: 14,
    titleWeight: 400,
    subtitleSize: 9,
    axisTitleSize: 9,
    gridWidth: 0.25,
    ticksX: false,
    ticksY: false,
    gridX: false,
    showPanelBorder: false,
  }),
  // theme_test (#823): pinned high-contrast chrome for package tests / VR.
  // Explicit literals — not an alias of light/classic — so product sweeps
  // cannot retarget snapshot chrome. Stability over brand aesthetics.
  test: themed({
    ink: "#000000",
    paper: "#ffffff",
    panel: "#ffffff",
    accent: "#000000",
    grid: "#cccccc",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    panelBorder: "#000000",
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: 11,
    axisTextSize: 12,
    fontWeight: 400,
    titleSize: 14,
    titleWeight: 700,
    subtitleSize: 12,
    subtitleWeight: 400,
    axisTitleSize: 11,
    axisTitleWeight: 400,
    captionSize: 9,
    stripSize: 11,
    stripWeight: 400,
    axisLineWidth: 0.5,
    tickWidth: 0.5,
    tickLength: 4,
    gridWidth: 0.5,
    panelBorderWidth: 0.5,
    gridDasharray: "",
    axisLineX: true,
    axisLineY: true,
    ticksX: true,
    ticksY: true,
    gridX: true,
    gridY: true,
    showPanelBorder: true,
  }),
});

const LEGACY_BASE = themed({
  ink: "currentColor",
  paper: "none",
  panel: "none",
  accent: "#4269d0",
  grid: "rgba(128,128,128,0.25)",
  axisText: "currentColor",
  axisLine: "currentColor",
  tickColor: "currentColor",
  panelBorder: "currentColor",
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSize: 11,
  axisTextSize: 11,
  fontWeight: 400,
  titleSize: 15,
  titleWeight: 700,
  subtitleSize: 12,
  subtitleWeight: 400,
  axisTitleSize: 11,
  axisTitleWeight: 400,
  captionSize: 9,
  stripSize: 11,
  stripWeight: 400,
  axisLineWidth: 1,
  tickWidth: 1,
  tickLength: 6,
  gridWidth: 1,
  panelBorderWidth: 1,
  axisLineX: true,
  axisLineY: true,
  ticksX: true,
  ticksY: true,
});

/** Edition-1 color themes with their original typography and chrome. */
export const LEGACY_BUILTIN_THEMES: Readonly<Record<ThemeName, ThemeTokens>> = Object.freeze({
  ...BUILTIN_THEMES,
  default: LEGACY_BASE,
  light: themed({
    ...LEGACY_BASE,
    ink: "#1f2328",
    paper: "#ffffff",
    panel: "none",
    axisText: "#1f2328",
    axisLine: "#1f2328",
    tickColor: "#1f2328",
    grid: "rgba(31,35,40,0.14)",
  }),
  dark: themed({
    ...LEGACY_BASE,
    ink: "#e6e8eb",
    paper: "#16181d",
    panel: "none",
    accent: "#7ea1f0",
    axisText: "#e6e8eb",
    axisLine: "#e6e8eb",
    tickColor: "#e6e8eb",
    grid: "rgba(230,232,235,0.16)",
  }),
  minimal: themed({
    ...LEGACY_BASE,
    accent: "#9498a0",
    grid: "rgba(128,128,128,0.12)",
  }),
});
