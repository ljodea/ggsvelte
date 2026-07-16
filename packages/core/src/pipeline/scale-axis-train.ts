/**
 * Positional axis training: type inference, band/continuous training, zero forcing.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { ContinuousConfig } from "../scales/train.js";
import { ScaleConfigError, trainBand, trainContinuous } from "../scales/train.js";

import { continuousDomainOf } from "./scale-axis-domain.js";
import type { AxisInputs, AxisTraining } from "./scale-axis-types.js";
import type { Advisory, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

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
    const domain = config?.domain;
    const scale = trainBand(inputs.columns, {
      ...(domain !== undefined && { domain }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
    });
    if (scale.domain.length === 0) {
      warnings.push({
        code: "empty-domain",
        message: `The ${axis} band scale has no categories.`,
      });
    }
    return { scale, advisories, warnings };
  }

  // --- continuous ------------------------------------------------------------
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
