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
  axisTitleSize: 9,
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
    tooltipBorder: foundation.grid === "none" ? foundation.panelBorder : foundation.grid,
    toolActive: foundation.ink,
  });
}

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
    axisTextSize: 8.8,
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
    axisTextSize: 8.8,
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
  ggplot2: themed({
    ink: "#333333",
    panel: "#ebebeb",
    grid: "#ffffff",
    axisText: "#4d4d4d",
    tickColor: "#333333",
    fontSize: 11,
    axisTextSize: 8.8,
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
  }),
  classic: themed({
    ink: "#000000",
    grid: "none",
    axisText: "#000000",
    axisLine: "#000000",
    tickColor: "#000000",
    fontSize: 11,
    axisTextSize: 8.8,
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
  few: themed({
    ink: "#333333",
    accent: "#5da5da",
    grid: "none",
    axisText: "#4d4d4d",
    fontSize: 12,
    axisTextSize: 9.6,
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
