/**
 * Sequential ramp strips for /palettes/ramps.
 *
 * Bundle isolation (guarded by scripts/docs-chart-stack-isolation.test.ts):
 * - The deep core source imports below match the higher-priority
 *   ggsvelte-palette-tables codeSplitting group, so only the pure hex tables
 *   ship — not the core pipeline/render mega-chunk.
 * - SEQUENTIAL_SCHEME_NAMES is mirrored by hand instead of value-importing
 *   the @ggsvelte/spec barrel (which would drag the TypeBox schema
 *   mega-chunk). apps/docs/tests/sequential-ramps.test.ts checks the mirror
 *   against the registry, so drift fails CI.
 */
import { colorBrewerStops } from "../../../../../packages/core/src/scales/colorbrewer-palettes.js";
import { sequentialSchemeRamp } from "../../../../../packages/core/src/scales/sequential-schemes.js";
import { tableauRampStops } from "../../../../../packages/core/src/scales/tableau-ramps.js";

/** Mirrors SEQUENTIAL_SCHEME_NAMES in @ggsvelte/spec (registry order). */
const SEQUENTIAL_SCHEME_NAME_LIST = [
  "viridis",
  "magma",
  "plasma",
  "inferno",
  "cividis",
  "turbo",
  "Blues",
  "Greens",
  "Reds",
  "Oranges",
  "Purples",
  "Greys",
  "YlOrRd",
  "YlGnBu",
  "BuPu",
  "RdYlBu",
  "RdBu",
  "BrBG",
  "Spectral",
  "PuOr",
  "tableau_seq_blue_green",
  "tableau_seq_blue_light",
  "tableau_seq_orange_light",
  "tableau_seq_blue",
  "tableau_seq_orange",
  "tableau_seq_green",
  "tableau_seq_red",
  "tableau_seq_purple",
  "tableau_seq_brown",
  "tableau_seq_gray",
  "tableau_seq_gray_warm",
  "tableau_seq_blue_teal",
  "tableau_seq_orange_gold",
  "tableau_seq_green_gold",
  "tableau_seq_red_gold",
  "tableau_div_orange_blue",
  "tableau_div_red_green",
  "tableau_div_green_blue",
  "tableau_div_red_blue",
  "tableau_div_red_black",
  "tableau_div_gold_purple",
  "tableau_div_red_green_gold",
  "tableau_div_sunset_sunrise",
  "tableau_div_orange_blue_white",
  "tableau_div_red_green_white",
  "tableau_div_green_blue_white",
  "tableau_div_red_blue_white",
  "tableau_div_red_black_white",
  "tableau_div_orange_blue_light",
  "tableau_div_temperature",
] as const;

export interface SequentialRampRow {
  readonly name: string;
  readonly colors: readonly string[];
}

/** Same resolution chain as the core scale engine (engine.ts). */
const rampStops = (name: string): readonly string[] | undefined =>
  sequentialSchemeRamp(name) ?? colorBrewerStops(name) ?? tableauRampStops(name);

export const SEQUENTIAL_RAMP_ROWS: readonly SequentialRampRow[] = SEQUENTIAL_SCHEME_NAME_LIST.map(
  (name) => {
    const ramp = rampStops(name);
    if (ramp === undefined) {
      throw new Error(`Missing sequential ramp for scheme "${name}"`);
    }
    return { name, colors: ramp };
  },
);
