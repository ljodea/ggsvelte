/**
 * Continuous positional axis training (linear/log/time) with zero forcing.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { ContinuousConfig } from "../scales/train.js";
import { ScaleConfigError, trainContinuous } from "../scales/train.js";

import { axisTransform, resolveScaleExpansion } from "./position-program.js";
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
  type: "linear" | "time",
  advisories: Advisory[],
  warnings: PipelineWarning[],
): AxisTraining {
  const zero = maybeForceZeroForBars(axis, inputs, config, type, advisories);

  const domain = continuousDomainOf(config, axis);
  const transform = axisTransform(config, type);
  const expansion = resolveScaleExpansion(config?.expand, type === "time");
  const continuousConfig: ContinuousConfig = {
    type,
    transform,
    expansion,
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
  // Explicit continuous breaks outside the trained (expanded, ggplot2-correct)
  // display domain are dropped by the layout tick filter; surface that drop as
  // a warning so it is observable (matches temporal-break-outside-domain).
  if (type !== "time" && config?.breaks !== undefined) {
    const [lo, hi] = training.scale.domain;
    const outside = config.breaks.filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && (value < lo || value > hi),
    );
    if (outside.length > 0) {
      warnings.push({
        code: "scale-break-outside-domain",
        message: `Omitted ${outside.length} explicit ${axis} break(s) outside the trained domain [${lo}, ${hi}]: ${outside.join(", ")}.`,
      });
    }
  }
  return { scale: training.scale, advisories, warnings };
}
