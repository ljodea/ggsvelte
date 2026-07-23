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
    ...(theme.letterboxFill !== undefined && { letterboxFill: theme.letterboxFill }),
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
    guideTitleSize: theme.guideTitleSize ?? base.guideTitleSize,
    legendKeySize: theme.legendKeySize ?? base.legendKeySize,
    legendKeyGap: theme.legendKeyGap ?? base.legendKeyGap,
    legendRowGap: theme.legendRowGap ?? base.legendRowGap,
    guideBlockGap: theme.guideBlockGap ?? base.guideBlockGap,
    colorbarThickness: theme.colorbarThickness ?? base.colorbarThickness,
    colorbarLengthMin: theme.colorbarLengthMin ?? base.colorbarLengthMin,
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
