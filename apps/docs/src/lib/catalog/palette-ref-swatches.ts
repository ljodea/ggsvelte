/**
 * Swatch joins for /reference/palettes: reference rows → strip colors, and
 * which schemes the /palettes chooser can deep-link to. Pure lookups — the
 * color tables come from the same deep-import modules as palette-tables.ts.
 */
import { CATEGORICAL_SCHEMES } from "./palette-tables";
import { SEQUENTIAL_RAMP_ROWS } from "./sequential-ramps";
import { CATEGORICAL_PALETTES } from "./themes";

const PICKER_NAMES = new Set<string>(CATEGORICAL_PALETTES.map((p) => p.name));

const SEQUENTIAL_BY_NAME = new Map(SEQUENTIAL_RAMP_ROWS.map((row) => [row.name, row.colors]));

export const categoricalSwatchFor = (name: string): readonly string[] | null =>
  Object.hasOwn(CATEGORICAL_SCHEMES, name)
    ? CATEGORICAL_SCHEMES[name as keyof typeof CATEGORICAL_SCHEMES]
    : null;

export const sequentialSwatchFor = (name: string): readonly string[] | null =>
  SEQUENTIAL_BY_NAME.get(name) ?? null;

/**
 * The scheme name when /palettes?scheme=<name> can pre-select it, else null.
 */
export const chooserSchemeFor = (name: string): string | null =>
  PICKER_NAMES.has(name) ? name : null;
