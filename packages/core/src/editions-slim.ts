/**
 * Slim defaults-edition tables: default + void themes only.
 */
import { VIRIDIS_RAMP_10 } from "./scales/viridis-ramp.js";
import { CATEGORICAL_PALETTE_10 } from "./scales/categorical-palettes.js";
import { SLIM_THEMES, SLIM_THEMES_LEGACY } from "./theme-slim.js";
import type { EditionDefaults } from "./editions-resolve.js";

export const EDITION_DEFAULTS_SLIM: Readonly<Record<number, EditionDefaults>> = Object.freeze({
  1: Object.freeze({
    categoricalPalette: CATEGORICAL_PALETTE_10,
    sequentialRamp: VIRIDIS_RAMP_10,
    themes: SLIM_THEMES_LEGACY,
  }),
  2: Object.freeze({
    categoricalPalette: CATEGORICAL_PALETTE_10,
    sequentialRamp: VIRIDIS_RAMP_10,
    themes: SLIM_THEMES,
  }),
});
