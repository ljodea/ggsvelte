/**
 * Sequential color domain and range resolution (config vs edition defaults).
 */
import { parseTemporalColumn, type ColorScaleSpec, type TemporalParserSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import { resolveSequentialPipelineRange } from "../scales/engine.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

export function resolveSequentialDomain(
  config?: ColorScaleSpec,
  temporalParser?: TemporalParserSpec,
): [number, number] | undefined {
  const domain = config?.domain;
  if (domain === undefined || domain.length !== 2) return undefined;
  if (temporalParser !== undefined) {
    const parsed = parseTemporalColumn(domain, temporalParser);
    if (parsed.valid[0] === 1 && parsed.valid[1] === 1) {
      return [parsed.semantic[0]!, parsed.semantic[1]!];
    }
  }
  return [cellToNumber(domain[0] as CellValue), cellToNumber(domain[1] as CellValue)];
}

/**
 * Edition-keyed default ramp: identical to trainSequential built-in for
 * edition 1 (undefined — keeps behavior byte-stable); other editions pass
 * their ramp. Explicit config always wins at the call site.
 */
export function resolveSequentialRange(
  config: ColorScaleSpec | undefined,
  editionDefaults: EditionDefaults,
): readonly string[] | undefined {
  return resolveSequentialPipelineRange(config, editionDefaults.sequentialRamp);
}
