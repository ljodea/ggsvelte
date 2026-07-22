/**
 * Position scale authoring helpers (x/y continuous, binned, temporal, discrete).
 * Color/fill helpers: scale-color-helpers.ts. Facade re-exports: scale-helpers.ts.
 */

import type { PositionScaleSpec, Scales } from "./schema.js";

export type TemporalScaleOptions = Omit<PositionScaleSpec, "type" | "temporalKind">;

/**
 * Options for the continuous/binned position families. Temporal-only fields are
 * excluded (use the date/datetime helpers for those). `limits` is authoring
 * sugar for `domain`; supplying both throws.
 */
export type ContinuousPositionScaleOptions = Omit<
  PositionScaleSpec,
  | "type"
  | "temporalKind"
  | "parse"
  | "parseFailure"
  | "timezone"
  | "disambiguation"
  | "dateBreaks"
  | "dateMinorBreaks"
  | "dateLabels"
  | "locale"
  | "weekStart"
> & {
  /** Pin the scale to [min, max] in source units (sugar for `domain`). */
  limits?: PositionScaleSpec["domain"];
};

/** Options for the transform-forcing helpers (log10/sqrt): `transform` is fixed. */
export type TransformedPositionScaleOptions = Omit<ContinuousPositionScaleOptions, "transform">;
export type DiscretePositionScaleOptions = Omit<
  PositionScaleSpec,
  | "type"
  | "temporalKind"
  | "parse"
  | "parseFailure"
  | "timezone"
  | "disambiguation"
  | "dateBreaks"
  | "dateMinorBreaks"
  | "dateLabels"
  | "locale"
  | "weekStart"
>;

function temporalScale(
  axis: "x" | "y",
  temporalKind: "date" | "datetime",
  options: TemporalScaleOptions = {},
): Scales {
  return { [axis]: { type: "time", temporalKind, ...options } };
}

function discreteScale(axis: "x" | "y", options: DiscretePositionScaleOptions = {}): Scales {
  const {
    type: _,
    temporalKind: __,
    parse: ___,
    parseFailure: ____,
    timezone: _____,
    disambiguation: ______,
    dateBreaks: _______,
    dateMinorBreaks: ________,
    dateLabels: _________,
    locale: __________,
    weekStart: ___________,
    ...discrete
  } = options as PositionScaleSpec;
  return { [axis]: { type: "band", ...discrete } };
}

export function scaleXDate(options: TemporalScaleOptions = {}): Scales {
  return temporalScale("x", "date", options);
}

export function scaleXDatetime(options: TemporalScaleOptions = {}): Scales {
  return temporalScale("x", "datetime", options);
}

export function scaleYDate(options: TemporalScaleOptions = {}): Scales {
  return temporalScale("y", "date", options);
}

export function scaleYDatetime(options: TemporalScaleOptions = {}): Scales {
  return temporalScale("y", "datetime", options);
}

export function scaleXDiscrete(options: DiscretePositionScaleOptions = {}): Scales {
  return discreteScale("x", options);
}

export function scaleYDiscrete(options: DiscretePositionScaleOptions = {}): Scales {
  return discreteScale("y", options);
}

export const scale_x_date = scaleXDate;
export const scale_x_datetime = scaleXDatetime;
export const scale_y_date = scaleYDate;
export const scale_y_datetime = scaleYDatetime;
export const scale_x_discrete = scaleXDiscrete;
export const scale_y_discrete = scaleYDiscrete;

// --- continuous / binned position families ----------------------------------

function continuousScale(
  axis: "x" | "y",
  type: "linear" | "binned",
  options: ContinuousPositionScaleOptions,
  forced: { transform?: "log10" | "sqrt"; reverse?: true } = {},
): Scales {
  const { limits, domain, transform, reverse, ...rest } = options;
  if (limits !== undefined && domain !== undefined) {
    throw new TypeError(
      "scale helper: supply either `limits` or `domain`, not both (both pin the scale).",
    );
  }
  const resolvedDomain = domain ?? limits;
  const resolvedTransform = forced.transform ?? transform;
  const resolvedReverse = forced.reverse ?? reverse;
  return {
    [axis]: {
      type,
      ...(resolvedTransform !== undefined && { transform: resolvedTransform }),
      ...(resolvedReverse !== undefined && { reverse: resolvedReverse }),
      ...(resolvedDomain !== undefined && { domain: resolvedDomain }),
      ...rest,
    },
  };
}

/** Configure the x scale as a continuous linear scale (default numeric family). */
export function scaleXContinuous(options: ContinuousPositionScaleOptions = {}): Scales {
  return continuousScale("x", "linear", options);
}

/** Configure the y scale as a continuous linear scale (default numeric family). */
export function scaleYContinuous(options: ContinuousPositionScaleOptions = {}): Scales {
  return continuousScale("y", "linear", options);
}

/** Configure the x scale as a base-10 log scale (pre-stat log10 transform). */
export function scaleXLog10(options: TransformedPositionScaleOptions = {}): Scales {
  return continuousScale("x", "linear", options, { transform: "log10" });
}

/** Configure the y scale as a base-10 log scale (pre-stat log10 transform). */
export function scaleYLog10(options: TransformedPositionScaleOptions = {}): Scales {
  return continuousScale("y", "linear", options, { transform: "log10" });
}

/** Configure the x scale as a square-root scale (pre-stat sqrt transform). */
export function scaleXSqrt(options: TransformedPositionScaleOptions = {}): Scales {
  return continuousScale("x", "linear", options, { transform: "sqrt" });
}

/** Configure the y scale as a square-root scale (pre-stat sqrt transform). */
export function scaleYSqrt(options: TransformedPositionScaleOptions = {}): Scales {
  return continuousScale("y", "linear", options, { transform: "sqrt" });
}

/** Reverse the x scale's output direction (identity continuous scale, reverse: true). */
export function scaleXReverse(
  options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {},
): Scales {
  return continuousScale("x", "linear", options, { reverse: true });
}

/** Reverse the y scale's output direction (identity continuous scale, reverse: true). */
export function scaleYReverse(
  options: Omit<ContinuousPositionScaleOptions, "transform" | "reverse"> = {},
): Scales {
  return continuousScale("y", "linear", options, { reverse: true });
}

/** Configure the x scale as a binned (ordered-bin) quantitative scale. */
export function scaleXBinned(options: ContinuousPositionScaleOptions = {}): Scales {
  return continuousScale("x", "binned", options);
}

/** Configure the y scale as a binned (ordered-bin) quantitative scale. */
export function scaleYBinned(options: ContinuousPositionScaleOptions = {}): Scales {
  return continuousScale("y", "binned", options);
}

export const scale_x_continuous = scaleXContinuous;
export const scale_y_continuous = scaleYContinuous;
export const scale_x_log10 = scaleXLog10;
export const scale_y_log10 = scaleYLog10;
export const scale_x_sqrt = scaleXSqrt;
export const scale_y_sqrt = scaleYSqrt;
export const scale_x_reverse = scaleXReverse;
export const scale_y_reverse = scaleYReverse;
export const scale_x_binned = scaleXBinned;
export const scale_y_binned = scaleYBinned;
