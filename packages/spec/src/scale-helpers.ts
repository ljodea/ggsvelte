import type { PositionScaleSpec, Scales } from "./schema.js";

export type TemporalScaleOptions = Omit<PositionScaleSpec, "type" | "temporalKind">;
export type DiscretePositionScaleOptions = Omit<
  PositionScaleSpec,
  "type" | "temporalKind" | "parse" | "parseFailure" | "timezone" | "disambiguation"
>;

function temporalScale(
  axis: "x" | "y",
  temporalKind: "date" | "datetime",
  options: TemporalScaleOptions = {},
): Scales {
  return { [axis]: { type: "time", temporalKind, ...options } };
}

function discreteScale(axis: "x" | "y", options: DiscretePositionScaleOptions = {}): Scales {
  return { [axis]: { type: "band", ...options } };
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
