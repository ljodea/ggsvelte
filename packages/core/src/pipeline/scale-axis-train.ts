/**
 * Positional axis training: type inference, band/continuous training, zero forcing.
 */
import type { LayerSpec, PositionScaleSpec } from "@ggsvelte/spec";

import type { ContinuousConfig, PositionScale } from "../scales/train.js";
import { ScaleConfigError, trainBand, trainContinuous } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import type { Advisory, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

/** Geoms whose marks extend from a zero baseline on the measure (y) axis. */
export function isBarLike(geom: LayerSpec["geom"]): boolean {
  return geom === "bar" || geom === "col" || geom === "area";
}

const POSITION_TYPE_OVERRIDE =
  'Set scales.AXIS.type ("linear" | "log" | "time" | "band") in the spec.';

function continuousDomainOf(
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

export interface AxisTraining {
  scale: PositionScale;
  advisories: Advisory[];
  warnings: PipelineWarning[];
}

export interface AxisInputs {
  /** Discrete columns contributing to a band domain. */
  columns: (readonly CellValue[])[];
  /** Continuous numeric arrays (post-stat / post-position). */
  numeric: Float64Array[];
  /** True when any contributing field is discrete or a geom forces bands. */
  anyDiscrete: boolean;
  /** True when every contributing field is temporal (and none discrete). */
  allTemporal: boolean;
  /** True when a bar-like geom measures on this axis (zero forcing). */
  barMeasure: boolean;
  /** Human-readable description of the evidence (advisory text). */
  evidence: string;
}

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
