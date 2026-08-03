/**
 * Sequential ramp strips for /palettes/ramps.
 *
 * Deep source import (not the @ggsvelte/core barrel) for the same reason as
 * palette-tables.ts: the docs vite config puts the whole core package into
 * one shared chunk, and these rows must not drag the chart stack onto the
 * page. This path matches the ggsvelte-palette-tables codeSplitting group.
 */
import { SEQUENTIAL_SCHEME_NAMES } from "@ggsvelte/spec";

import { colorBrewerStops } from "../../../../../packages/core/src/scales/colorbrewer-palettes.js";
import { sequentialSchemeRamp } from "../../../../../packages/core/src/scales/sequential-schemes.js";
import { tableauRampStops } from "../../../../../packages/core/src/scales/tableau-ramps.js";

export interface SequentialRampRow {
  readonly name: string;
  readonly colors: readonly string[];
}

/** Same resolution chain as the core scale engine (engine.ts). */
const rampStops = (name: string): readonly string[] | undefined =>
  sequentialSchemeRamp(name) ?? colorBrewerStops(name) ?? tableauRampStops(name);

export const SEQUENTIAL_RAMP_ROWS: readonly SequentialRampRow[] = SEQUENTIAL_SCHEME_NAMES.map(
  (name) => {
    const ramp = rampStops(name);
    if (ramp === undefined) {
      throw new Error(`Missing sequential ramp for scheme "${name}"`);
    }
    return { name, colors: ramp };
  },
);
