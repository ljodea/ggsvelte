/**
 * Resolve ordinal color range from explicit config vs edition defaults.
 */
import type { ColorScaleSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { CATEGORICAL_PALETTE_10 } from "../scales/train.js";

/**
 * Edition-keyed default palette: for edition 1 nothing is passed (trainColor
 * keeps its "observable10" scheme fingerprint — byte-stable with pre-edition
 * state); other editions pass their palette as an explicit range.
 * Named schemes resolve inside trainColor; edition defaults only apply when
 * the caller supplied neither a scheme nor an explicit range.
 */
export function resolveOrdinalColorRange(
  config: ColorScaleSpec | undefined,
  editionDefaults: EditionDefaults,
): readonly string[] | undefined {
  const scheme = config?.scheme;
  const editionPalette =
    editionDefaults.categoricalPalette === CATEGORICAL_PALETTE_10
      ? undefined
      : editionDefaults.categoricalPalette;
  return config?.range ?? (scheme === undefined ? editionPalette : undefined);
}
