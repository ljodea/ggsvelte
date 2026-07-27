/**
 * Per-guide legend scene builders (discrete / ramp / steps).
 *
 * Split modules:
 * - legend-build-types.ts — input/output contracts + LegendLayoutError
 * - legend-build-shared.ts — layout metrics, settings, label presentation
 * - legend-build-discrete.ts — categorical builder
 * - legend-build-continuous.ts — ramp + steps builders
 */
import type { TextMeasurer } from "./layout/measure.js";
import type { SceneLegend } from "./scene.js";
import { buildRamp, buildSteps } from "./legend-build-continuous.js";
import { buildDiscrete } from "./legend-build-discrete.js";
import type { LegendInput, LegendOrder } from "./legend-build-types.js";

export type {
  DiscreteLegendInput,
  LegendBlock,
  LegendInput,
  LegendOrder,
  RampLegendInput,
  ResolvedLegendAppearance,
  StepsLegendInput,
} from "./legend-build-types.js";
export { LegendLayoutError } from "./legend-build-types.js";
export { BLOCK_GAP, disambiguatedLabels, LEGEND_ROW_HEIGHT } from "./legend-build-shared.js";

export function buildForPosition(
  input: LegendInput,
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
): SceneLegend {
  if (input.kind === "discrete") return buildDiscrete(input, order, measurer, maxWidth, position);
  if (input.kind === "steps") return buildSteps(input, measurer, maxWidth, position);
  return buildRamp(input, measurer, maxWidth, position);
}
