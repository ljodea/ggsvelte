/**
 * Continuous positional axis training (linear/log/time) with zero forcing.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { ContinuousConfig } from "../scales/train.js";
import { ScaleConfigError, trainContinuous } from "../scales/train.js";

import { continuousDomainOf } from "./scale-axis-domain.js";
import type { AxisInputs, AxisTraining } from "./scale-axis-types.js";
import type { Advisory, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

export function trainContinuousAxis(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
  type: "linear" | "log" | "time",
  advisories: Advisory[],
  warnings: PipelineWarning[],
): AxisTraining {
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

  const domain = continuousDomainOf(config, axis);
  const continuousConfig: ContinuousConfig = {
    type,
    ...(domain !== undefined && { domain }),
    ...(config?.nice !== undefined && { nice: config.nice }),
    ...(zero !== undefined && { zero }),
    ...(config?.reverse !== undefined && { reverse: config.reverse }),
  };
  let training;
  try {
    training = trainContinuous(inputs.numeric, continuousConfig);
  } catch (error) {
    if (error instanceof ScaleConfigError) {
      throw new PipelineError(error.code, `/scales/${axis}`, error.message);
    }
    throw error;
  }
  if (training.empty) {
    warnings.push({
      code: "empty-domain",
      message: `The ${axis} scale has no finite${type === "log" ? " positive" : ""} values; using a default domain.`,
    });
  }
  if (training.nonPositive > 0) {
    warnings.push({
      code: "log-nonpositive",
      message: `Removed ${training.nonPositive} non-positive value(s) from the ${axis} log scale (log10 is undefined at or below zero).`,
    });
  }
  return { scale: training.scale, advisories, warnings };
}
