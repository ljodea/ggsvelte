/**
 * Bar/area zero-baseline advisory for continuous positional axes.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { AxisInputs } from "./scale-axis-types.js";
import type { Advisory } from "./types.js";

export function maybeForceZeroForBars(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
  type: "linear" | "log" | "time",
  advisories: Advisory[],
): boolean | undefined {
  let zero = config?.zero;
  if (inputs.barMeasure && type !== "time" && zero === undefined && config?.domain === undefined) {
    zero = true;
    advisories.push({
      code: "zero-forced",
      path: `scales.${axis}`,
      chosen: "domain extended to include 0 (bars/areas measure from a zero baseline)",
      howToOverride: `Set scales.${axis}.zero to false, or pin scales.${axis}.domain.`,
    });
  }
  return zero;
}
