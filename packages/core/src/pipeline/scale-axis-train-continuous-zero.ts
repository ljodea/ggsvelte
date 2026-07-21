/**
 * Bar/area zero-baseline advisory for continuous positional axes.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import { axisTransform } from "./position-program.js";
import type { AxisInputs } from "./scale-axis-types.js";
import type { Advisory } from "./types.js";

/**
 * Family- and transform-aware zero forcing for bar/area measure axes. It forces
 * semantic zero and emits `zero-forced` only when the axis is non-temporal and
 * zero is a valid transform input (identity/sqrt) — never for log10 (which has
 * no semantic-zero image; its bars use the transformed-space origin) or time.
 */
export function maybeForceZeroForBars(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
  type: "linear" | "time",
  advisories: Advisory[],
): boolean | undefined {
  let zero = config?.zero;
  const transform = axisTransform(config, type);
  if (
    inputs.barMeasure &&
    type !== "time" &&
    transform.valid(0) &&
    zero === undefined &&
    config?.domain === undefined
  ) {
    zero = true;
    advisories.push({
      code: "zero-forced",
      path: `scales.${axis}`,
      chosen: "domain extended to include 0 (bars/areas measure from a zero baseline)",
      howToOverride: `Set scales.${axis}.zero to false, or pin scales.${axis}.domain.`,
    });
  }
  // log10 has no semantic-zero image; bar/col/area/histogram/density baseline
  // at the transformed-space origin (semantic 1) instead. One deduplicated
  // per-axis advisory — this runs once per axis training call.
  if (inputs.barMeasure && transform.key === "log10") {
    advisories.push({
      code: "scale-baseline-transformed-origin",
      path: `scales.${axis}`,
      chosen: "bars/areas/density baseline at the transformed-space origin 0 (semantic 1)",
      howToOverride: "log10 has no semantic-zero image; this baseline is not configurable.",
    });
  }
  return zero;
}
