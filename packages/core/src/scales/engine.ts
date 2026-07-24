/**
 * Scale engine: policies owned once (#643).
 *
 * Orchestration collects evidence and packs legends; trainers and pipeline
 * color families call into this module for:
 * - degenerate-domain padding
 * - NA / unknown color defaults
 * - palette / ramp precedence
 * - transform registry as the only forward/valid source for sequential color
 */
import { CATEGORICAL_PALETTE_10, CATEGORICAL_SCHEMES } from "./categorical-palettes.js";
import { normalizeColor } from "./normalize-color.js";
import { VIRIDIS_RAMP_10 } from "./viridis-ramp.js";

/** Default NA / unknown color when authors omit either side. */
export const DEFAULT_MISSING_COLOR = "#999999";

/**
 * Symmetric pad for zero-variance continuous domains (ggplot2-style).
 * Shared by positional training and sequential color training.
 */
export function padDegenerateDomain(min: number, max: number): [number, number] {
  if (min === max) return [min - 0.5, max + 0.5];
  return [min, max];
}

export interface MissingColorConfig {
  naValue?: string;
  unknownValue?: string;
}

/** Resolve NA/unknown colors from optional author config (normalized #rrggbb). */
export function resolveMissingColors(config?: MissingColorConfig): {
  naValue: string;
  unknownValue: string;
} {
  return {
    naValue: normalizeColor(config?.naValue ?? DEFAULT_MISSING_COLOR),
    unknownValue: normalizeColor(config?.unknownValue ?? DEFAULT_MISSING_COLOR),
  };
}

export interface PaletteConfig {
  range?: readonly string[];
  scheme?: string;
}

/**
 * Pipeline-facing ordinal range. Explicit range wins. Named schemes leave
 * range undefined so {@link resolveOrdinalPaletteStops} / trainColor keep
 * scheme fingerprints. Edition palettes apply only when they differ from the
 * built-in default (edition-1 byte-stability).
 */
export function resolveOrdinalPipelineRange(
  config: PaletteConfig | undefined,
  editionPalette: readonly string[],
): readonly string[] | undefined {
  const scheme = config?.scheme;
  const edition = editionPalette === CATEGORICAL_PALETTE_10 ? undefined : editionPalette;
  return config?.range ?? (scheme === undefined ? edition : undefined);
}

/** Trainer-facing ordinal stops: explicit range > named scheme > built-in. */
export function resolveOrdinalPaletteStops(
  input: {
    range?: readonly string[];
    scheme?: string;
  } = {},
): readonly string[] {
  if (input.range !== undefined) return input.range;
  if (input.scheme === "viridis") return VIRIDIS_RAMP_10;
  if (input.scheme !== undefined) {
    const named = CATEGORICAL_SCHEMES[input.scheme as keyof typeof CATEGORICAL_SCHEMES];
    if (named !== undefined) return named;
  }
  return CATEGORICAL_PALETTE_10;
}

/**
 * Pipeline-facing sequential range. Explicit range wins; `scheme: "viridis"`
 * selects the built-in ramp; edition ramps apply only when they differ from
 * viridis (edition-1 byte-stability).
 */
export function resolveSequentialPipelineRange(
  config: PaletteConfig | undefined,
  editionRamp: readonly string[],
): readonly string[] | undefined {
  const edition = editionRamp === VIRIDIS_RAMP_10 ? undefined : editionRamp;
  const namedSchemeRamp = config?.scheme === "viridis" ? VIRIDIS_RAMP_10 : undefined;
  return config?.range ?? namedSchemeRamp ?? edition;
}
