/**
 * Derived helper views over the scale-capability ledger.
 *
 * Imports the raw `SCALE_CAPABILITIES` data from `capabilities-data.ts`
 * (a leaf module) so this file and the `capabilities.ts` facade never form
 * a runtime cycle — the `STYLE_AESTHETIC_GEOMS` reference below is a
 * type-only import, erased at runtime.
 */
import type { STYLE_AESTHETIC_GEOMS } from "./capabilities.js";
import { SCALE_CAPABILITIES } from "./capabilities-data.js";

export type ScaleCapability = (typeof SCALE_CAPABILITIES)[number];

/**
 * CamelCase non-Colour helpers declared on `SCALE_CAPABILITIES`.
 * Shared source for builder generation, Scale* shell completeness, and tests
 * so helper-name sets are not re-derived by hand in each consumer (#1081 PR B).
 */
export function scaleCapabilityCamelHelpers(): readonly string[] {
  const out = new Set<string>();
  for (const cap of SCALE_CAPABILITIES) {
    for (const h of cap.helpers) {
      if (h.includes("_")) continue;
      if (h.includes("Colour")) continue;
      out.add(h);
    }
  }
  return [...out].toSorted();
}

/**
 * ggplot2-style ordinal camelCase aliases for style channels
 * (binding-identical to the corresponding `*Discrete` helpers).
 *
 * Component shells re-export Ordinal names as aliases of Discrete shells
 * (#830/#832) — they are NOT separate SHELL_MANIFEST entries, so they stay
 * off the main ledger helper arrays. The builder mixin and package root still
 * expose them; this constant is the single source for that extra set.
 */
export const STYLE_ORDINAL_SCALE_HELPERS = [
  "scaleSizeOrdinal",
  "scaleAlphaOrdinal",
  "scaleLinewidthOrdinal",
  "scaleShapeOrdinal",
] as const;

/** Helpers the GGBuilder scale mixin must wrap (ledger camel + style ordinals). */
export function builderScaleHelperNames(): readonly string[] {
  return [
    ...new Set([...scaleCapabilityCamelHelpers(), ...STYLE_ORDINAL_SCALE_HELPERS]),
  ].toSorted();
}

export type StyleAesthetic = keyof typeof STYLE_AESTHETIC_GEOMS;
