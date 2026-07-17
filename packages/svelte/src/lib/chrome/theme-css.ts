/** Interaction theme roles exposed as CSS custom properties on the plot root.
 *  Values may be color strings or numeric opacities (e.g. interactionMuted). */
export type PlotThemeCssTokens = {
  readonly interactionInk: string | number;
  readonly interactionMuted: string | number;
  readonly focusRing: string | number;
  readonly crosshair: string | number;
  readonly selectionFill: string | number;
  readonly selectionStroke: string | number;
  readonly tooltipPaper: string | number;
  readonly tooltipInk: string | number;
  readonly tooltipBorder: string | number;
  readonly toolActive: string | number;
};

const THEME_ROLES = [
  "interactionInk",
  "interactionMuted",
  "focusRing",
  "crosshair",
  "selectionFill",
  "selectionStroke",
  "tooltipPaper",
  "tooltipInk",
  "tooltipBorder",
  "toolActive",
] as const satisfies readonly (keyof PlotThemeCssTokens)[];

/** Stable role-order CSS custom property string for interaction chrome. */
export function themeTokensToCss(tokens: PlotThemeCssTokens): string {
  return THEME_ROLES.map((role) => `--gg-theme-${role}:${tokens[role]}`).join(";");
}
