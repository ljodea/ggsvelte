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
}

/** Built-in themes. `default` preserves the M0c currentColor behavior. */
export const BUILTIN_THEMES: Readonly<Record<ThemeName, ThemeTokens>> = Object.freeze({
  default: {
    ink: "currentColor",
    paper: "none",
    accent: "#4269d0",
    grid: "rgba(128,128,128,0.25)",
  },
  light: {
    ink: "#1f2328",
    paper: "#ffffff",
    accent: "#4269d0",
    grid: "rgba(31,35,40,0.14)",
  },
  dark: {
    ink: "#e6e8eb",
    paper: "#16181d",
    accent: "#7ea1f0",
    grid: "rgba(230,232,235,0.16)",
  },
  minimal: {
    ink: "currentColor",
    paper: "none",
    accent: "#9498a0",
    grid: "rgba(128,128,128,0.12)",
  },
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
  return {
    ink: theme.ink ?? base.ink,
    paper: theme.paper ?? base.paper,
    accent: theme.accent ?? base.accent,
    grid: theme.grid ?? base.grid,
  };
}

/** A theme role wrapped in its --gg-* custom property with the token fallback. */
export function themeVar(role: keyof ThemeTokens, tokens: ThemeTokens): string {
  return `var(--gg-${role}, ${tokens[role]})`;
}
