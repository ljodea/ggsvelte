import type { ColorScaleSpec, PositionScaleSpec, Scales } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema-names.js";

const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

/** Resolve family intent encoded by family-specific options before data inference. */
export function configuredColorScaleType(
  config: ColorScaleSpec | undefined,
): ColorScaleSpec["type"] | undefined {
  if (config?.type !== undefined) return config.type;
  if (config?.scheme !== undefined && config.range === undefined) {
    return SEQUENTIAL_SCHEMES.has(config.scheme) ? "sequential" : "ordinal";
  }
  if (
    config?.transform !== undefined ||
    config?.temporalKind !== undefined ||
    config?.parse !== undefined ||
    config?.parseFailure !== undefined ||
    config?.timezone !== undefined ||
    config?.disambiguation !== undefined ||
    config?.breaks !== undefined ||
    config?.oob !== undefined ||
    config?.labels !== undefined
  ) {
    return "sequential";
  }
  if (config?.domainMode !== undefined || config?.onExhaust !== undefined) return "ordinal";
  return undefined;
}

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

// --- generic non-position color/fill families -------------------------------

export type ColorScaleOptions = Omit<ColorScaleSpec, "type">;
export type SequentialColorScaleOptions = Omit<ColorScaleOptions, "domainMode" | "onExhaust">;
export type BinnedColorScaleOptions = SequentialColorScaleOptions;
export type DiscreteColorScaleOptions = Pick<
  ColorScaleSpec,
  | "domain"
  | "domainMode"
  | "range"
  | "scheme"
  | "reverse"
  | "naValue"
  | "unknownValue"
  | "onExhaust"
>;
export type TransformedColorScaleOptions = Omit<
  SequentialColorScaleOptions,
  "transform" | "temporalKind" | "parse" | "parseFailure" | "timezone" | "disambiguation"
>;
export type TemporalColorScaleOptions = Omit<
  SequentialColorScaleOptions,
  "transform" | "temporalKind"
>;
export type ManualColorScaleOptions = Pick<
  ColorScaleSpec,
  "domain" | "naValue" | "unknownValue"
> & {
  /** Colors paired positionally with the explicit or trained domain. */
  values: NonNullable<ColorScaleSpec["range"]>;
};
export type IdentityColorScaleOptions = Pick<ColorScaleSpec, "naValue" | "unknownValue">;

type ColorAesthetic = "color" | "fill";

function colorScale(
  aesthetic: ColorAesthetic,
  type: "ordinal" | "sequential" | "binned" | "manual" | "identity",
  options: ColorScaleOptions = {},
  forced: {
    transform?: "log10" | "sqrt";
    temporalKind?: "date" | "datetime";
  } = {},
): Scales {
  return {
    [aesthetic]: {
      type,
      ...options,
      ...(forced.transform !== undefined && { transform: forced.transform }),
      ...(forced.temporalKind !== undefined && { temporalKind: forced.temporalKind }),
    },
  };
}

function manualColorScale(aesthetic: ColorAesthetic, options: ManualColorScaleOptions): Scales {
  const { values, ...rest } = options;
  return colorScale(aesthetic, "manual", { ...rest, range: [...values] });
}

// Color/colour helpers share function identity. American camelCase is the
// TypeScript-primary spelling; British and snake_case names are exact aliases.
export function scaleColorContinuous(options: SequentialColorScaleOptions = {}): Scales {
  return colorScale("color", "sequential", options);
}
export function scaleColorDiscrete(options: DiscreteColorScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", options);
}
export function scaleColorBinned(options: BinnedColorScaleOptions = {}): Scales {
  return colorScale("color", "binned", options);
}
export function scaleColorLog10(options: TransformedColorScaleOptions = {}): Scales {
  return colorScale("color", "sequential", options, { transform: "log10" });
}
export function scaleColorSqrt(options: TransformedColorScaleOptions = {}): Scales {
  return colorScale("color", "sequential", options, { transform: "sqrt" });
}
export function scaleColorDate(options: TemporalColorScaleOptions = {}): Scales {
  return colorScale("color", "sequential", options, { temporalKind: "date" });
}
export function scaleColorDatetime(options: TemporalColorScaleOptions = {}): Scales {
  return colorScale("color", "sequential", options, { temporalKind: "datetime" });
}
export function scaleColorManual(options: ManualColorScaleOptions): Scales {
  return manualColorScale("color", options);
}
export function scaleColorIdentity(options: IdentityColorScaleOptions = {}): Scales {
  return colorScale("color", "identity", options);
}

export const scaleColourContinuous = scaleColorContinuous;
export const scaleColourDiscrete = scaleColorDiscrete;
export const scaleColourBinned = scaleColorBinned;
export const scaleColourLog10 = scaleColorLog10;
export const scaleColourSqrt = scaleColorSqrt;
export const scaleColourDate = scaleColorDate;
export const scaleColourDatetime = scaleColorDatetime;
export const scaleColourManual = scaleColorManual;
export const scaleColourIdentity = scaleColorIdentity;
export const scale_color_continuous = scaleColorContinuous;
export const scale_color_discrete = scaleColorDiscrete;
export const scale_color_binned = scaleColorBinned;
export const scale_color_log10 = scaleColorLog10;
export const scale_color_sqrt = scaleColorSqrt;
export const scale_color_date = scaleColorDate;
export const scale_color_datetime = scaleColorDatetime;
export const scale_color_manual = scaleColorManual;
export const scale_color_identity = scaleColorIdentity;
export const scale_colour_continuous = scaleColorContinuous;
export const scale_colour_discrete = scaleColorDiscrete;
export const scale_colour_binned = scaleColorBinned;
export const scale_colour_log10 = scaleColorLog10;
export const scale_colour_sqrt = scaleColorSqrt;
export const scale_colour_date = scaleColorDate;
export const scale_colour_datetime = scaleColorDatetime;
export const scale_colour_manual = scaleColorManual;
export const scale_colour_identity = scaleColorIdentity;

export function scaleFillContinuous(options: SequentialColorScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", options);
}
export function scaleFillDiscrete(options: DiscreteColorScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", options);
}
export function scaleFillBinned(options: BinnedColorScaleOptions = {}): Scales {
  return colorScale("fill", "binned", options);
}
export function scaleFillLog10(options: TransformedColorScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", options, { transform: "log10" });
}
export function scaleFillSqrt(options: TransformedColorScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", options, { transform: "sqrt" });
}
export function scaleFillDate(options: TemporalColorScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", options, { temporalKind: "date" });
}
export function scaleFillDatetime(options: TemporalColorScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", options, { temporalKind: "datetime" });
}
export function scaleFillManual(options: ManualColorScaleOptions): Scales {
  return manualColorScale("fill", options);
}
export function scaleFillIdentity(options: IdentityColorScaleOptions = {}): Scales {
  return colorScale("fill", "identity", options);
}

export const scale_fill_continuous = scaleFillContinuous;
export const scale_fill_discrete = scaleFillDiscrete;
export const scale_fill_binned = scaleFillBinned;
export const scale_fill_log10 = scaleFillLog10;
export const scale_fill_sqrt = scaleFillSqrt;
export const scale_fill_date = scaleFillDate;
export const scale_fill_datetime = scaleFillDatetime;
export const scale_fill_manual = scaleFillManual;
export const scale_fill_identity = scaleFillIdentity;
