/**
 * Marks-only themes (void / map / solid) paint transparent paper and dark ink.
 * On the light site that reads correctly; on the dark docs shell the same ink
 * disappears into the page background.
 *
 * Other built-ins keep opaque paper, so they stay legible without this path.
 * Role values match the dark-site shell tokens in styles/tokens.css.
 */
import type { ThemeName, ThemeSpec } from "@ggsvelte/spec";

import type { DocsAppearance } from "./docs-appearance.js";

/** Built-in themes with paper+panel "none" — marks and type sit on the host. */
export const MARKS_ONLY_THEME_NAMES = [
  "void",
  "map",
  "solid",
] as const satisfies readonly ThemeName[];

export type MarksOnlyThemeName = (typeof MARKS_ONLY_THEME_NAMES)[number];

const MARKS_ONLY = new Set<string>(MARKS_ONLY_THEME_NAMES);

/** High-contrast foreground roles when the docs shell is dark. */
export const MARKS_ONLY_DARK_SITE_ROLES = {
  ink: "#e9edf4",
  axisText: "#aab4c4",
  axisLine: "#e9edf4",
  tickColor: "#e9edf4",
  interactionInk: "#e9edf4",
  toolActive: "#e9edf4",
} as const satisfies Pick<
  ThemeSpec,
  "ink" | "axisText" | "axisLine" | "tickColor" | "interactionInk" | "toolActive"
>;

export function isMarksOnlyTheme(name: string): name is MarksOnlyThemeName {
  return MARKS_ONLY.has(name);
}

/**
 * Role overrides for a marks-only theme on the dark docs shell.
 * Empty object when the theme has its own paper or the site is light.
 */
export function marksOnlyThemeRoles(
  name: ThemeName,
  appearance: DocsAppearance,
): Partial<
  Pick<ThemeSpec, "ink" | "axisText" | "axisLine" | "tickColor" | "interactionInk" | "toolActive">
> {
  if (appearance !== "dark" || !isMarksOnlyTheme(name)) return {};
  return { ...MARKS_ONLY_DARK_SITE_ROLES };
}

/** Static shell path for a theme's dark-site portrait (marks-only only). */
export function marksOnlyDarkSiteShellPath(themeName: MarksOnlyThemeName): string {
  return `/theme-shells/theme-${themeName}-dark-site.svg`;
}
