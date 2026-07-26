/**
 * Non-position color/fill scale authoring helpers and configuredColorScaleType.
 * Position helpers: scale-position-helpers.ts. Facade re-exports: scale-helpers.ts.
 */

import type { ColorScaleSpec, Scales } from "./schema.js";
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
  | "guide"
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
  "domain" | "naValue" | "unknownValue" | "guide"
> & {
  /** Colors paired positionally with the explicit or trained domain. */
  values: NonNullable<ColorScaleSpec["range"]>;
};
export type IdentityColorScaleOptions = Pick<ColorScaleSpec, "naValue" | "unknownValue" | "guide">;

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

// --- steps / steps2 / stepsn (#827) ----------------------------------------
// Binned continuous colour with hard steps (ggplot2 scale_*_steps*).

/** Two-stop stepped continuous colour (default navy → sky). */
export type StepsScaleOptions = Omit<BinnedColorScaleOptions, "scheme" | "range"> & {
  low?: string;
  high?: string;
};

/**
 * Three-stop stepped diverging colour.
 * v1: no `midpoint` param (asymmetric domain remapping deferred).
 */
export type Steps2ScaleOptions = Omit<BinnedColorScaleOptions, "scheme" | "range"> & {
  low?: string;
  mid?: string;
  high?: string;
};

/** N-stop stepped colour; requires ≥2 hex stops via colours/colors/values. */
export type StepsnScaleOptions = Omit<BinnedColorScaleOptions, "scheme" | "range"> & {
  colours?: readonly string[];
  colors?: readonly string[];
  values?: readonly string[];
};

const STEPS_DEFAULT_LOW = "#132B43";
const STEPS_DEFAULT_HIGH = "#56B1F7";
const STEPS2_DEFAULT_LOW = "#B2182B";
const STEPS2_DEFAULT_MID = "#F7F7F7";
const STEPS2_DEFAULT_HIGH = "#2166AC";

function stepsRange(options: StepsScaleOptions): BinnedColorScaleOptions {
  const { low = STEPS_DEFAULT_LOW, high = STEPS_DEFAULT_HIGH, ...rest } = options;
  return { ...rest, range: [low, high] };
}

function steps2Range(options: Steps2ScaleOptions): BinnedColorScaleOptions {
  const {
    low = STEPS2_DEFAULT_LOW,
    mid = STEPS2_DEFAULT_MID,
    high = STEPS2_DEFAULT_HIGH,
    ...rest
  } = options;
  return { ...rest, range: [low, mid, high] };
}

function stepsnRange(options: StepsnScaleOptions): BinnedColorScaleOptions {
  const { colours, colors, values, ...rest } = options;
  const stops = colours ?? colors ?? values;
  if (stops === undefined || stops.length < 2) {
    throw new Error(
      "scale_*_stepsn requires colours/colors/values with at least 2 #rgb/#rrggbb stops.",
    );
  }
  return { ...rest, range: [...stops] };
}

export function scaleColorSteps(options: StepsScaleOptions = {}): Scales {
  return colorScale("color", "binned", stepsRange(options));
}
export function scaleColorSteps2(options: Steps2ScaleOptions = {}): Scales {
  return colorScale("color", "binned", steps2Range(options));
}
export function scaleColorStepsn(options: StepsnScaleOptions = {}): Scales {
  return colorScale("color", "binned", stepsnRange(options));
}

export function scaleFillSteps(options: StepsScaleOptions = {}): Scales {
  return colorScale("fill", "binned", stepsRange(options));
}
export function scaleFillSteps2(options: Steps2ScaleOptions = {}): Scales {
  return colorScale("fill", "binned", steps2Range(options));
}
export function scaleFillStepsn(options: StepsnScaleOptions = {}): Scales {
  return colorScale("fill", "binned", stepsnRange(options));
}

export const scaleColourSteps = scaleColorSteps;
export const scaleColourSteps2 = scaleColorSteps2;
export const scaleColourStepsn = scaleColorStepsn;
export const scale_color_steps = scaleColorSteps;
export const scale_color_steps2 = scaleColorSteps2;
export const scale_color_stepsn = scaleColorStepsn;
export const scale_colour_steps = scaleColorSteps;
export const scale_colour_steps2 = scaleColorSteps2;
export const scale_colour_stepsn = scaleColorStepsn;
export const scale_fill_steps = scaleFillSteps;
export const scale_fill_steps2 = scaleFillSteps2;
export const scale_fill_stepsn = scaleFillStepsn;
