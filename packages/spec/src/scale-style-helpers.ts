/**
 * Non-position mapped style scale authoring helpers.
 * Position and color/fill helpers live in their sibling modules; the stable
 * public facade re-exports this module from scale-helpers.ts.
 */

import type { CellValue, GuideSpec, PositiveStyleScaleSpec, Scales } from "./schema.js";
import type { LinetypeName, PointShapeName } from "./schema-names.js";

// --- mapped numeric and finite-symbol styles --------------------------------

type NumericStyleAesthetic = "size" | "linewidth" | "alpha";
type FiniteStyleAesthetic = "shape" | "linetype";
type NumericStyleScaleSpec = PositiveStyleScaleSpec;

export type NumericStyleScaleOptions = Omit<NumericStyleScaleSpec, "type">;
export type SequentialStyleScaleOptions = Omit<
  NumericStyleScaleOptions,
  "domainMode" | "onExhaust"
>;
export type DiscreteNumericStyleScaleOptions = Pick<
  NumericStyleScaleSpec,
  "domain" | "domainMode" | "range" | "reverse" | "naValue" | "unknownValue" | "onExhaust" | "guide"
>;
export type TemporalNumericStyleScaleOptions = Omit<SequentialStyleScaleOptions, "temporalKind">;
export type ManualNumericStyleScaleOptions = Pick<
  NumericStyleScaleSpec,
  "domain" | "naValue" | "unknownValue" | "guide"
> & { values: NonNullable<NumericStyleScaleSpec["range"]> };
export type IdentityNumericStyleScaleOptions = Pick<
  NumericStyleScaleSpec,
  "naValue" | "unknownValue" | "guide"
>;
export interface FiniteStyleScaleOptions<Output extends string = PointShapeName | LinetypeName> {
  domain?: readonly CellValue[];
  domainMode?: "grow" | "data";
  breaks?: readonly number[];
  range?: readonly Output[];
  reverse?: boolean;
  naValue?: Output;
  unknownValue?: Output;
  onExhaust?: "cycle" | "error";
  labels?: string;
  guide?: GuideSpec;
}
export type DiscreteFiniteStyleScaleOptions<Output extends string = PointShapeName | LinetypeName> =
  Omit<FiniteStyleScaleOptions<Output>, "breaks" | "labels">;
export type BinnedFiniteStyleScaleOptions<Output extends string = PointShapeName | LinetypeName> =
  Omit<FiniteStyleScaleOptions<Output>, "domain" | "domainMode" | "onExhaust"> & {
    domain?: readonly [number, number];
  };
type ShapeDiscreteStyleScaleOptions = DiscreteFiniteStyleScaleOptions<PointShapeName>;
type ShapeBinnedStyleScaleOptions = BinnedFiniteStyleScaleOptions<PointShapeName>;
type LinetypeDiscreteStyleScaleOptions = DiscreteFiniteStyleScaleOptions<LinetypeName>;
type LinetypeBinnedStyleScaleOptions = BinnedFiniteStyleScaleOptions<LinetypeName>;
export interface ManualFiniteStyleScaleOptions<
  Output extends string = PointShapeName | LinetypeName,
> {
  domain?: readonly CellValue[];
  values: readonly Output[];
  naValue?: Output;
  unknownValue?: Output;
  guide?: GuideSpec;
}
export interface IdentityFiniteStyleScaleOptions<
  Output extends string = PointShapeName | LinetypeName,
> {
  naValue?: Output;
  unknownValue?: Output;
  guide?: GuideSpec;
}

function numericStyleScale(
  aesthetic: NumericStyleAesthetic,
  type: "ordinal" | "sequential" | "binned" | "manual" | "identity",
  options: NumericStyleScaleOptions = {},
  temporalKind?: "date" | "datetime",
): Scales {
  return {
    [aesthetic]: {
      type,
      ...options,
      ...(temporalKind !== undefined && { temporalKind }),
    },
  };
}

function manualNumericStyleScale(
  aesthetic: NumericStyleAesthetic,
  options: ManualNumericStyleScaleOptions,
): Scales {
  const { values, ...rest } = options;
  return numericStyleScale(aesthetic, "manual", { ...rest, range: [...values] });
}

function finiteStyleScale(
  aesthetic: FiniteStyleAesthetic,
  type: "ordinal" | "binned" | "manual" | "identity",
  options: FiniteStyleScaleOptions = {},
): Scales {
  return { [aesthetic]: { type, ...options } };
}

function manualFiniteStyleScale(
  aesthetic: FiniteStyleAesthetic,
  options: ManualFiniteStyleScaleOptions,
): Scales {
  const { values, ...rest } = options;
  return { [aesthetic]: { type: "manual", ...rest, range: [...values] } };
}

export function scaleSizeContinuous(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "sequential", options);
}
export function scaleSizeDiscrete(options: DiscreteNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "ordinal", options);
}
export function scaleSizeBinned(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "binned", options);
}
export function scaleSizeDate(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "sequential", options, "date");
}
export function scaleSizeDatetime(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "sequential", options, "datetime");
}
export function scaleSizeManual(options: ManualNumericStyleScaleOptions): Scales {
  return manualNumericStyleScale("size", options);
}
export function scaleSizeIdentity(options: IdentityNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("size", "identity", options);
}

export function scaleLinewidthContinuous(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "sequential", options);
}
export function scaleLinewidthDiscrete(options: DiscreteNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "ordinal", options);
}
export function scaleLinewidthBinned(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "binned", options);
}
export function scaleLinewidthDate(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "sequential", options, "date");
}
export function scaleLinewidthDatetime(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "sequential", options, "datetime");
}
export function scaleLinewidthManual(options: ManualNumericStyleScaleOptions): Scales {
  return manualNumericStyleScale("linewidth", options);
}
export function scaleLinewidthIdentity(options: IdentityNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("linewidth", "identity", options);
}

export function scaleAlphaContinuous(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "sequential", options);
}
export function scaleAlphaDiscrete(options: DiscreteNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "ordinal", options);
}
export function scaleAlphaBinned(options: SequentialStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "binned", options);
}
export function scaleAlphaDate(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "sequential", options, "date");
}
export function scaleAlphaDatetime(options: TemporalNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "sequential", options, "datetime");
}
export function scaleAlphaManual(options: ManualNumericStyleScaleOptions): Scales {
  return manualNumericStyleScale("alpha", options);
}
export function scaleAlphaIdentity(options: IdentityNumericStyleScaleOptions = {}): Scales {
  return numericStyleScale("alpha", "identity", options);
}

export function scaleShapeDiscrete(options: ShapeDiscreteStyleScaleOptions = {}): Scales {
  return finiteStyleScale("shape", "ordinal", options);
}
export function scaleShapeBinned(options: ShapeBinnedStyleScaleOptions = {}): Scales {
  return finiteStyleScale("shape", "binned", options);
}
export function scaleShapeManual(options: ManualFiniteStyleScaleOptions<PointShapeName>): Scales {
  return manualFiniteStyleScale("shape", options);
}
export function scaleShapeIdentity(
  options: IdentityFiniteStyleScaleOptions<PointShapeName> = {},
): Scales {
  return finiteStyleScale("shape", "identity", options);
}

export function scaleLinetypeDiscrete(options: LinetypeDiscreteStyleScaleOptions = {}): Scales {
  return finiteStyleScale("linetype", "ordinal", options);
}
export function scaleLinetypeBinned(options: LinetypeBinnedStyleScaleOptions = {}): Scales {
  return finiteStyleScale("linetype", "binned", options);
}
export function scaleLinetypeManual(options: ManualFiniteStyleScaleOptions<LinetypeName>): Scales {
  return manualFiniteStyleScale("linetype", options);
}
export function scaleLinetypeIdentity(
  options: IdentityFiniteStyleScaleOptions<LinetypeName> = {},
): Scales {
  return finiteStyleScale("linetype", "identity", options);
}

export const scaleSize = scaleSizeContinuous;
export const scaleLinewidth = scaleLinewidthContinuous;
export const scaleAlpha = scaleAlphaContinuous;
export const scaleShape = scaleShapeDiscrete;
export const scaleLinetype = scaleLinetypeDiscrete;
export const scale_size_continuous = scaleSizeContinuous;
export const scale_size_discrete = scaleSizeDiscrete;
export const scale_size_binned = scaleSizeBinned;
export const scale_size_date = scaleSizeDate;
export const scale_size_datetime = scaleSizeDatetime;
export const scale_size_manual = scaleSizeManual;
export const scale_size_identity = scaleSizeIdentity;
export const scale_linewidth_continuous = scaleLinewidthContinuous;
export const scale_linewidth_discrete = scaleLinewidthDiscrete;
export const scale_linewidth_binned = scaleLinewidthBinned;
export const scale_linewidth_date = scaleLinewidthDate;
export const scale_linewidth_datetime = scaleLinewidthDatetime;
export const scale_linewidth_manual = scaleLinewidthManual;
export const scale_linewidth_identity = scaleLinewidthIdentity;
export const scale_alpha_continuous = scaleAlphaContinuous;
export const scale_alpha_discrete = scaleAlphaDiscrete;
export const scale_alpha_binned = scaleAlphaBinned;
export const scale_alpha_date = scaleAlphaDate;
export const scale_alpha_datetime = scaleAlphaDatetime;
export const scale_alpha_manual = scaleAlphaManual;
export const scale_alpha_identity = scaleAlphaIdentity;
export const scale_shape = scaleShapeDiscrete;
export const scale_shape_discrete = scaleShapeDiscrete;
export const scale_shape_binned = scaleShapeBinned;
export const scale_shape_manual = scaleShapeManual;
export const scale_shape_identity = scaleShapeIdentity;
export const scale_linetype = scaleLinetypeDiscrete;
export const scale_linetype_discrete = scaleLinetypeDiscrete;
export const scale_linetype_binned = scaleLinetypeBinned;
export const scale_linetype_manual = scaleLinetypeManual;
export const scale_linetype_identity = scaleLinetypeIdentity;
