/**
 * Defaults editions (Hadley lesson 13: fix accumulated bad defaults "without
 * breaking existing code").
 *
 * `normalize()` (in @ggsvelte/spec) stamps `edition: CURRENT_EDITION` onto
 * every spec that does not already carry one, freezing which generation of
 * DEFAULT aesthetics the spec was authored against. This module is the other
 * half of the mechanism: the pipeline resolves its default theme table,
 * default categorical palette, and default sequential ramp THROUGH the spec's
 * edition, so a future edition can ship better defaults while every stamped
 * spec keeps its original look. Explicit settings (spec.theme, scales.*.range,
 * scales.*.scheme) always win over edition defaults.
 *
 * There is no global mutable registry (Hadley lesson 14): the edition table is
 * frozen, and callers who need to extend it (tests proving the mechanism; a
 * future edition-2 rollout) pass a table via `RunOptions.editions`, scoped to
 * the run.
 *
 * Unknown editions (a spec stamped by a NEWER ggsvelte than the one rendering
 * it) fall back to the latest edition this build knows, and the pipeline emits
 * an `unknown-edition` warning — old renderers degrade to their best defaults
 * instead of failing.
 */
import type { ThemeName } from "@ggsvelte/spec";

import { VIRIDIS_RAMP_10 } from "./scales/color.js";
import { CATEGORICAL_PALETTE_10 } from "./scales/train.js";
import type { ThemeTokens } from "./theme.js";
import { BUILTIN_THEMES } from "./theme.js";

/** The default-aesthetics bundle one edition pins. */
export interface EditionDefaults {
  /** Default range for discrete color/fill scales (no scheme/range set). */
  categoricalPalette: readonly string[];
  /** Default ramp stops for sequential color/fill scales. */
  sequentialRamp: readonly string[];
  /** Built-in theme tokens the theme registry resolves names against. */
  themes: Readonly<Record<ThemeName, ThemeTokens>>;
}

/** Editions known to this build. Edition 1 = the 0.1.0 defaults. */
export const EDITION_DEFAULTS: Readonly<Record<number, EditionDefaults>> = Object.freeze({
  1: Object.freeze({
    categoricalPalette: CATEGORICAL_PALETTE_10,
    sequentialRamp: VIRIDIS_RAMP_10,
    themes: BUILTIN_THEMES,
  }),
});

export interface ResolvedEdition {
  /** The edition whose defaults apply (after fallback). */
  edition: number;
  defaults: EditionDefaults;
  /** Set when the requested edition is unknown to the table (fallback used). */
  unknownRequested: number | null;
}

/**
 * Resolve the defaults for a spec's edition. `undefined` means "current"
 * (normalize stamps specs, but non-validating callers may skip it); unknown
 * editions fall back to the latest known one (see module docs).
 */
export function resolveEditionDefaults(
  edition?: number,
  table: Readonly<Record<number, EditionDefaults>> = EDITION_DEFAULTS,
): ResolvedEdition {
  const known = Object.keys(table)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .toSorted((a, b) => a - b);
  if (known.length === 0) throw new Error("resolveEditionDefaults: empty edition table");
  const latest = known.at(-1)!;
  const requested = edition ?? latest;
  const defaults = table[requested];
  if (defaults !== undefined) {
    return { edition: requested, defaults, unknownRequested: null };
  }
  return { edition: latest, defaults: table[latest]!, unknownRequested: requested };
}
