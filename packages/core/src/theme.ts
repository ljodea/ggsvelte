/**
 * Theme registry (plan: "theme registry (named built-ins + object overrides;
 * unknown name = tier-1 error)"; Hadley lesson 8: styling roles separate from
 * data channels).
 *
 * A theme resolves to ROLE TOKENS — ink / paper / accent / grid — that feed
 * geom defaults: unmapped lines, points, rules, and text draw with the ink
 * role; unmapped bars, columns, and areas fill with the accent role; the
 * panel background paints with paper. Data-encoding channels (color/fill
 * mappings) are a separate concept and never come from the theme.
 *
 * Every rendered color rides a `--gg-*` CSS custom property with the resolved
 * token as fallback (`var(--gg-ink, currentColor)`), so hosts can restyle a
 * rendered SVG without a re-render, and the default theme's currentColor
 * behavior (inherit the page color, adapting to light/dark) is preserved
 * byte-for-byte deterministic in renderToSVGString output.
 *
 * There is no global mutable registry (Hadley lesson 14): the built-ins are
 * a frozen table, and object themes are resolved per plot instance.
 */
import type { ThemeName, ThemeSpec } from "@ggsvelte/spec";
import { THEME_NAMES } from "@ggsvelte/spec";

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
function themed(overrides: Partial<FoundationThemeTokens>): ThemeTokens {
  const foundation = { ...HRBR_BASE, ...overrides };
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

/** Thrown for unknown theme names (tier-1 error per the plan). */
export class UnknownThemeError extends Error {
  readonly theme: string;

  constructor(theme: string) {
    super(
      `Unknown theme "${theme}". Registered themes: ${THEME_NAMES.join(", ")}. ` +
        "Pass a registered name or a theme object ({ name?, ink?, paper?, accent?, grid? }).",
    );
    this.name = "UnknownThemeError";
    this.theme = theme;
  }
}

/**
 * Resolve a spec theme (name or object override) to role tokens.
 * Unknown names throw (the schema also rejects them at tier 1 — this covers
 * non-validating callers). `builtins` is the name table to resolve against —
 * the pipeline passes the spec's EDITION's theme table (editions.ts), so a
 * future edition can restyle the built-ins without changing stamped specs.
 */
export function resolveTheme(
  theme: ThemeName | ThemeSpec | undefined,
  builtins: Readonly<Record<ThemeName, ThemeTokens>> = BUILTIN_THEMES,
): ThemeTokens {
  if (theme === undefined) return builtins.default;
  if (typeof theme === "string") {
    const tokens = (builtins as Record<string, ThemeTokens>)[theme];
    if (tokens === undefined) throw new UnknownThemeError(theme);
    return tokens;
  }
  const base = resolveTheme(theme.name, builtins);
  const resolved = themed({
    ink: theme.ink ?? base.ink,
    paper: theme.paper ?? base.paper,
    accent: theme.accent ?? base.accent,
    grid: theme.grid ?? base.grid,
    panel: theme.panel ?? base.panel,
    axisText: theme.axisText ?? base.axisText,
    axisLine: theme.axisLine ?? base.axisLine,
    tickColor: theme.tickColor ?? base.tickColor,
    panelBorder: theme.panelBorder ?? base.panelBorder,
    fontFamily: theme.fontFamily ?? base.fontFamily,
    fontSize: theme.fontSize ?? base.fontSize,
    axisTextSize: theme.axisTextSize ?? base.axisTextSize,
    fontWeight: theme.fontWeight ?? base.fontWeight,
    titleSize: theme.titleSize ?? base.titleSize,
    titleWeight: theme.titleWeight ?? base.titleWeight,
    subtitleSize: theme.subtitleSize ?? base.subtitleSize,
    subtitleWeight: theme.subtitleWeight ?? base.subtitleWeight,
    axisTitleSize: theme.axisTitleSize ?? base.axisTitleSize,
    axisTitleWeight: theme.axisTitleWeight ?? base.axisTitleWeight,
    captionSize: theme.captionSize ?? base.captionSize,
    stripSize: theme.stripSize ?? base.stripSize,
    stripWeight: theme.stripWeight ?? base.stripWeight,
    axisLineWidth: theme.axisLineWidth ?? base.axisLineWidth,
    tickWidth: theme.tickWidth ?? base.tickWidth,
    tickLength: theme.tickLength ?? base.tickLength,
    gridWidth: theme.gridWidth ?? base.gridWidth,
    panelBorderWidth: theme.panelBorderWidth ?? base.panelBorderWidth,
    gridDasharray: theme.gridDasharray ?? base.gridDasharray,
    axisLineX: theme.axisLineX ?? base.axisLineX,
    axisLineY: theme.axisLineY ?? base.axisLineY,
    ticksX: theme.ticksX ?? base.ticksX,
    ticksY: theme.ticksY ?? base.ticksY,
    gridX: theme.gridX ?? base.gridX,
    gridY: theme.gridY ?? base.gridY,
    showPanelBorder: theme.showPanelBorder ?? base.showPanelBorder,
  });
  return {
    ...resolved,
    interactionInk: theme.interactionInk ?? resolved.interactionInk,
    interactionMuted: theme.interactionMuted ?? resolved.interactionMuted,
    focusRing: theme.focusRing ?? resolved.focusRing,
    crosshair: theme.crosshair ?? resolved.crosshair,
    selectionFill: theme.selectionFill ?? resolved.selectionFill,
    selectionStroke: theme.selectionStroke ?? resolved.selectionStroke,
    tooltipPaper: theme.tooltipPaper ?? resolved.tooltipPaper,
    tooltipInk: theme.tooltipInk ?? resolved.tooltipInk,
    tooltipBorder: theme.tooltipBorder ?? resolved.tooltipBorder,
    toolActive: theme.toolActive ?? resolved.toolActive,
  };
}

export type ThemeColorRole =
  | "ink"
  | "paper"
  | "accent"
  | "grid"
  | "panel"
  | "axisText"
  | "axisLine"
  | "tickColor"
  | "panelBorder"
  | "interactionInk"
  | "focusRing"
  | "crosshair"
  | "selectionFill"
  | "selectionStroke"
  | "tooltipPaper"
  | "tooltipInk"
  | "tooltipBorder"
  | "toolActive";

export type ThemeRole = ThemeColorRole | "interactionMuted";

/** A theme role wrapped in its --gg-* custom property with the token fallback. */
export function themeVar(role: ThemeRole, tokens: ThemeTokens): string {
  return `var(--gg-${role}, ${tokens[role]})`;
}
