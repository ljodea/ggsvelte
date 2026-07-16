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
import { maybeForceZeroForBars } from "./scale-axis-train-continuous-zero.js";
import { pushContinuousTrainingWarnings } from "./scale-axis-train-continuous-warn.js";

export function trainContinuousAxis(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
  type: "linear" | "log" | "time",
  advisories: Advisory[],
  warnings: PipelineWarning[],
): AxisTraining {
  const zero = maybeForceZeroForBars(axis, inputs, config, type, advisories);

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
  pushContinuousTrainingWarnings(axis, type, training, warnings);
  return { scale: training.scale, advisories, warnings };
}
