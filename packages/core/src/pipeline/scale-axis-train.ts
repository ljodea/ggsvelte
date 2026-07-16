/**
 * Positional axis training: type inference, band/continuous training, zero forcing.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import { trainBandAxis } from "./scale-axis-train-band.js";
import { trainContinuousAxis } from "./scale-axis-train-continuous.js";
import type { AxisInputs, AxisTraining } from "./scale-axis-types.js";
import type { Advisory, PipelineWarning } from "./types.js";

export type { AxisInputs, AxisTraining } from "./scale-axis-types.js";
export { isBarLike } from "./scale-axis-types.js";

const POSITION_TYPE_OVERRIDE =
  'Set scales.AXIS.type ("linear" | "log" | "time" | "band") in the spec.';

export function trainAxis(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
): AxisTraining {
  const advisories: Advisory[] = [];
  const warnings: PipelineWarning[] = [];
  const howToOverride = POSITION_TYPE_OVERRIDE.replace("AXIS", axis);

  let type = config?.type;
  if (type === undefined) {
    type = inputs.anyDiscrete ? "band" : inputs.allTemporal ? "time" : "linear";
    advisories.push({
      code: "scale-type-inferred",
      path: `scales.${axis}`,
      chosen: `${type} (${inputs.evidence})`,
      howToOverride,
    });
  }

  if (type === "band") {
    return trainBandAxis(axis, inputs, config, advisories, warnings);
  }
  return trainContinuousAxis(axis, inputs, config, type, advisories, warnings);
  // type is continuous after band guard (linear | log | time)
}
