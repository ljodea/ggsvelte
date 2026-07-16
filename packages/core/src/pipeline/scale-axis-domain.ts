/**
 * Continuous scale domain parsing for positional axes.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import { PipelineError } from "./types.js";

export function continuousDomainOf(
  config: PositionScaleSpec | undefined,
  axis: "x" | "y",
): [number, number] | undefined {
  if (config?.domain === undefined) return undefined;
  if (config.domain.length !== 2) {
    throw new PipelineError(
      "invalid-scale-domain",
      `/scales/${axis}/domain`,
      `A continuous ${axis} domain needs exactly [min, max] (got ${config.domain.length} entries).`,
    );
  }
  const lo = cellToNumber(config.domain[0] as CellValue);
  const hi = cellToNumber(config.domain[1] as CellValue);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    throw new PipelineError(
      "invalid-scale-domain",
      `/scales/${axis}/domain`,
      `The ${axis} domain [${String(config.domain[0])}, ${String(config.domain[1])}] does not parse to finite numbers (use numbers, or ISO 8601 strings for time scales).`,
    );
  }
  return lo <= hi ? [lo, hi] : [hi, lo];
}
