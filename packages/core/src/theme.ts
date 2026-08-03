/**
 * Theme registry (plan: "theme registry (named built-ins + object overrides;
 * unknown name = tier-1 error)"; Hadley lesson 8: styling roles separate from
 * data channels).
 *
 * A theme resolves to ROLE TOKENS — ink / paper / accent / grid — that feed
 * geom defaults. Built-in tables and themed() construction live in
 * theme-builtins.ts; this module owns resolveTheme / themeVar / errors and
 * re-exports the public table surface for a stable ./theme.js import path.
 *
 * There is no global mutable registry (Hadley lesson 14): the built-ins are
 * a frozen table, and object themes are resolved per plot instance.
 */
import type { ThemeName, ThemeSpec } from "@ggsvelte/spec";
import { THEME_NAMES } from "@ggsvelte/spec";

import { BUILTIN_THEMES, themed, type ThemeTokens } from "./theme-builtins.js";

export { BUILTIN_THEMES, LEGACY_BUILTIN_THEMES, type ThemeTokens } from "./theme-builtins.js";

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
 * Concrete foundation (+ letterbox) bag for themed() — all keys present so
 * exactOptionalPropertyTypes does not see `T | undefined` on optional props.
 * Shared by pureFromBase and mergeFoundation so sticky-when-elevated detection
 * cannot false-sticky #1069 borders from an incomplete pure list.
 */
type FoundationBag = {
  ink: string;
  paper: string;
  accent: string;
  grid: string;
  panel: string;
  letterboxFill: string;
  axisText: string;
  axisLine: string;
  tickColor: string;
  panelBorder: string;
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
  labelsX: boolean;
  labelsY: boolean;
  gridX: boolean;
  gridY: boolean;
  showPanelBorder: boolean;
};

function foundationFromTokens(t: ThemeTokens): FoundationBag {
  return {
    ink: t.ink,
    paper: t.paper,
    accent: t.accent,
    grid: t.grid,
    panel: t.panel,
    letterboxFill: t.letterboxFill,
    axisText: t.axisText,
    axisLine: t.axisLine,
    tickColor: t.tickColor,
    panelBorder: t.panelBorder,
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    axisTextSize: t.axisTextSize,
    fontWeight: t.fontWeight,
    titleSize: t.titleSize,
    titleWeight: t.titleWeight,
    subtitleSize: t.subtitleSize,
    subtitleWeight: t.subtitleWeight,
    axisTitleSize: t.axisTitleSize,
    axisTitleWeight: t.axisTitleWeight,
    guideTitleSize: t.guideTitleSize,
    legendKeySize: t.legendKeySize,
    legendKeyGap: t.legendKeyGap,
    legendRowGap: t.legendRowGap,
    guideBlockGap: t.guideBlockGap,
    colorbarThickness: t.colorbarThickness,
    colorbarLengthMin: t.colorbarLengthMin,
    captionSize: t.captionSize,
    stripSize: t.stripSize,
    stripWeight: t.stripWeight,
    axisLineWidth: t.axisLineWidth,
    tickWidth: t.tickWidth,
    tickLength: t.tickLength,
    gridWidth: t.gridWidth,
    panelBorderWidth: t.panelBorderWidth,
    gridDasharray: t.gridDasharray,
    axisLineX: t.axisLineX,
    axisLineY: t.axisLineY,
    ticksX: t.ticksX,
    ticksY: t.ticksY,
    labelsX: t.labelsX,
    labelsY: t.labelsY,
    gridX: t.gridX,
    gridY: t.gridY,
    showPanelBorder: t.showPanelBorder,
  };
}

/** Merge ThemeSpec role overrides over a named base's foundation keys. */
function mergeFoundation(theme: ThemeSpec, base: ThemeTokens): FoundationBag {
  const fromBase = foundationFromTokens(base);
  return {
    ink: theme.ink ?? fromBase.ink,
    paper: theme.paper ?? fromBase.paper,
    accent: theme.accent ?? fromBase.accent,
    grid: theme.grid ?? fromBase.grid,
    panel: theme.panel ?? fromBase.panel,
    // Match prior object path: only override letterbox when the spec sets it.
    letterboxFill: theme.letterboxFill ?? fromBase.letterboxFill,
    axisText: theme.axisText ?? fromBase.axisText,
    axisLine: theme.axisLine ?? fromBase.axisLine,
    tickColor: theme.tickColor ?? fromBase.tickColor,
    panelBorder: theme.panelBorder ?? fromBase.panelBorder,
    fontFamily: theme.fontFamily ?? fromBase.fontFamily,
    fontSize: theme.fontSize ?? fromBase.fontSize,
    axisTextSize: theme.axisTextSize ?? fromBase.axisTextSize,
    fontWeight: theme.fontWeight ?? fromBase.fontWeight,
    titleSize: theme.titleSize ?? fromBase.titleSize,
    titleWeight: theme.titleWeight ?? fromBase.titleWeight,
    subtitleSize: theme.subtitleSize ?? fromBase.subtitleSize,
    subtitleWeight: theme.subtitleWeight ?? fromBase.subtitleWeight,
    axisTitleSize: theme.axisTitleSize ?? fromBase.axisTitleSize,
    axisTitleWeight: theme.axisTitleWeight ?? fromBase.axisTitleWeight,
    guideTitleSize: theme.guideTitleSize ?? fromBase.guideTitleSize,
    legendKeySize: theme.legendKeySize ?? fromBase.legendKeySize,
    legendKeyGap: theme.legendKeyGap ?? fromBase.legendKeyGap,
    legendRowGap: theme.legendRowGap ?? fromBase.legendRowGap,
    guideBlockGap: theme.guideBlockGap ?? fromBase.guideBlockGap,
    colorbarThickness: theme.colorbarThickness ?? fromBase.colorbarThickness,
    colorbarLengthMin: theme.colorbarLengthMin ?? fromBase.colorbarLengthMin,
    captionSize: theme.captionSize ?? fromBase.captionSize,
    stripSize: theme.stripSize ?? fromBase.stripSize,
    stripWeight: theme.stripWeight ?? fromBase.stripWeight,
    axisLineWidth: theme.axisLineWidth ?? fromBase.axisLineWidth,
    tickWidth: theme.tickWidth ?? fromBase.tickWidth,
    tickLength: theme.tickLength ?? fromBase.tickLength,
    gridWidth: theme.gridWidth ?? fromBase.gridWidth,
    panelBorderWidth: theme.panelBorderWidth ?? fromBase.panelBorderWidth,
    gridDasharray: theme.gridDasharray ?? fromBase.gridDasharray,
    axisLineX: theme.axisLineX ?? fromBase.axisLineX,
    axisLineY: theme.axisLineY ?? fromBase.axisLineY,
    ticksX: theme.ticksX ?? fromBase.ticksX,
    ticksY: theme.ticksY ?? fromBase.ticksY,
    labelsX: theme.labelsX ?? fromBase.labelsX,
    labelsY: theme.labelsY ?? fromBase.labelsY,
    gridX: theme.gridX ?? fromBase.gridX,
    gridY: theme.gridY ?? fromBase.gridY,
    showPanelBorder: theme.showPanelBorder ?? fromBase.showPanelBorder,
  };
}

/**
 * Prefer explicit ThemeSpec tip, else elevated named package, else re-derived.
 * Sticky only when the named base's tip differs from pure foundation derivation.
 */
function pickTooltipRole(
  explicit: string | undefined,
  baseTip: string,
  rederived: string,
  pureBaseTip: string,
): string {
  if (explicit !== undefined) return explicit;
  // Named complete theme elevated this role above pure derivation — stick it
  // when the author only tweaked other roles.
  if (baseTip !== pureBaseTip) return baseTip;
  return rederived;
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
  // Same foundation key set for both calls — sticky detection is
  // baseTip !== pureBaseTip; incomplete pure lists cause false-sticky.
  const resolved = themed(mergeFoundation(theme, base));
  const pureFromBase = themed(foundationFromTokens(base));
  return {
    ...resolved,
    interactionInk: theme.interactionInk ?? resolved.interactionInk,
    interactionMuted: theme.interactionMuted ?? resolved.interactionMuted,
    focusRing: theme.focusRing ?? resolved.focusRing,
    crosshair: theme.crosshair ?? resolved.crosshair,
    selectionFill: theme.selectionFill ?? resolved.selectionFill,
    selectionStroke: theme.selectionStroke ?? resolved.selectionStroke,
    tooltipPaper: pickTooltipRole(
      theme.tooltipPaper,
      base.tooltipPaper,
      resolved.tooltipPaper,
      pureFromBase.tooltipPaper,
    ),
    tooltipInk: pickTooltipRole(
      theme.tooltipInk,
      base.tooltipInk,
      resolved.tooltipInk,
      pureFromBase.tooltipInk,
    ),
    tooltipBorder: pickTooltipRole(
      theme.tooltipBorder,
      base.tooltipBorder,
      resolved.tooltipBorder,
      pureFromBase.tooltipBorder,
    ),
    toolActive: theme.toolActive ?? resolved.toolActive,
  };
}

export type ThemeColorRole =
  | "ink"
  | "paper"
  | "accent"
  | "grid"
  | "panel"
  | "letterboxFill"
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
