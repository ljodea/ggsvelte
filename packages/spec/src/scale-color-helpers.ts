/**
 * Non-position color/fill scale authoring helpers and configuredColorScaleType.
 * Position helpers: scale-position-helpers.ts. Facade re-exports: scale-helpers.ts.
 */

import type { ColorScaleSpec, Scales } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema-names.js";
import { buildGreyPalette, buildHuePalette } from "./hue-grey-palettes.js";

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

// --- gradient / gradient2 / gradientn (#826) --------------------------------
// Map onto sequential color with explicit range stops. Hex-only (ColorScaleSpec).

/** ggplot2-shaped two-stop continuous colour (default navy → sky). */
export type GradientScaleOptions = Omit<SequentialColorScaleOptions, "scheme" | "range"> & {
  low?: string;
  high?: string;
};

/**
 * Diverging three-stop continuous colour.
 * v1: mid is the center stop of `range` only — no asymmetric domain remapping
 * (ggplot2 `midpoint` deferred; not accepted so it cannot silently no-op).
 */
export type Gradient2ScaleOptions = Omit<SequentialColorScaleOptions, "scheme" | "range"> & {
  low?: string;
  mid?: string;
  high?: string;
};

/** N-stop continuous colour; requires ≥2 hex stops via colours/colors/values. */
export type GradientnScaleOptions = Omit<SequentialColorScaleOptions, "scheme" | "range"> & {
  colours?: readonly string[];
  colors?: readonly string[];
  values?: readonly string[];
};

const GRADIENT_DEFAULT_LOW = "#132B43";
const GRADIENT_DEFAULT_HIGH = "#56B1F7";
/** ggsvelte diverging defaults (red–light–blue); not claimed as ggplot2 muted(). */
const GRADIENT2_DEFAULT_LOW = "#B2182B";
const GRADIENT2_DEFAULT_MID = "#F7F7F7";
const GRADIENT2_DEFAULT_HIGH = "#2166AC";

function gradientRange(options: GradientScaleOptions): SequentialColorScaleOptions {
  const { low = GRADIENT_DEFAULT_LOW, high = GRADIENT_DEFAULT_HIGH, ...rest } = options;
  return { ...rest, range: [low, high] };
}

function gradient2Range(options: Gradient2ScaleOptions): SequentialColorScaleOptions {
  const {
    low = GRADIENT2_DEFAULT_LOW,
    mid = GRADIENT2_DEFAULT_MID,
    high = GRADIENT2_DEFAULT_HIGH,
    ...rest
  } = options;
  return { ...rest, range: [low, mid, high] };
}

function gradientnRange(options: GradientnScaleOptions): SequentialColorScaleOptions {
  const { colours, colors, values, ...rest } = options;
  const stops = colours ?? colors ?? values;
  if (stops === undefined || stops.length < 2) {
    throw new Error(
      "scale_*_gradientn requires colours/colors/values with at least 2 #rgb/#rrggbb stops.",
    );
  }
  return { ...rest, range: [...stops] };
}

export function scaleColorGradient(options: GradientScaleOptions = {}): Scales {
  return colorScale("color", "sequential", gradientRange(options));
}
export function scaleColorGradient2(options: Gradient2ScaleOptions = {}): Scales {
  return colorScale("color", "sequential", gradient2Range(options));
}
export function scaleColorGradientn(options: GradientnScaleOptions = {}): Scales {
  return colorScale("color", "sequential", gradientnRange(options));
}

export function scaleFillGradient(options: GradientScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", gradientRange(options));
}
export function scaleFillGradient2(options: Gradient2ScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", gradient2Range(options));
}
export function scaleFillGradientn(options: GradientnScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", gradientnRange(options));
}

export const scaleColourGradient = scaleColorGradient;
export const scaleColourGradient2 = scaleColorGradient2;
export const scaleColourGradientn = scaleColorGradientn;
export const scale_color_gradient = scaleColorGradient;
export const scale_color_gradient2 = scaleColorGradient2;
export const scale_color_gradientn = scaleColorGradientn;
export const scale_colour_gradient = scaleColorGradient;
export const scale_colour_gradient2 = scaleColorGradient2;
export const scale_colour_gradientn = scaleColorGradientn;
export const scale_fill_gradient = scaleFillGradient;
export const scale_fill_gradient2 = scaleFillGradient2;
export const scale_fill_gradientn = scaleFillGradientn;
// --- hue / grey / ordinal (#829) --------------------------------------------

const HUE_STOPS = 10;
const GREY_STOPS = 10;

/** scale_*_hue options: discrete + optional HSL-ish h/c/l (bake range if set). */
export type HueScaleOptions = Omit<DiscreteColorScaleOptions, "scheme" | "range"> & {
  /** Hue range in degrees [start, end). Default [15, 375). */
  h?: readonly [number, number];
  /** Chroma proxy 0–100 → HSL saturation. Default 100. */
  c?: number;
  /** Lightness 0–100. Default 65. */
  l?: number;
};

/** scale_*_grey / gray options. */
export type GreyScaleOptions = Omit<DiscreteColorScaleOptions, "scheme" | "range"> & {
  /** Lightness start in [0, 1]. Default 0.2. */
  start?: number;
  /** Lightness end in [0, 1]. Default 0.8. */
  end?: number;
};

export type OrdinalColorScaleOptions = DiscreteColorScaleOptions;

function hueConfig(options: HueScaleOptions): DiscreteColorScaleOptions {
  const { h, c, l, ...rest } = options;
  if (h !== undefined || c !== undefined || l !== undefined) {
    return {
      ...rest,
      range: buildHuePalette(HUE_STOPS, h ?? [15, 375], c ?? 100, l ?? 65),
    };
  }
  return { ...rest, scheme: "hue" };
}

function greyConfig(options: GreyScaleOptions): DiscreteColorScaleOptions {
  const { start, end, ...rest } = options;
  if (start !== undefined || end !== undefined) {
    return {
      ...rest,
      range: buildGreyPalette(GREY_STOPS, start ?? 0.2, end ?? 0.8),
    };
  }
  return { ...rest, scheme: "grey" };
}

export function scaleColorHue(options: HueScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", hueConfig(options));
}
export function scaleColorGrey(options: GreyScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", greyConfig(options));
}
/** Binding-identical American spelling of scaleColorGrey. */
export const scaleColorGray = scaleColorGrey;
/** Binding-identical alias of scaleColorDiscrete (ggplot2 scale_*_ordinal). */
export const scaleColorOrdinal = scaleColorDiscrete;

export function scaleFillHue(options: HueScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", hueConfig(options));
}
export function scaleFillGrey(options: GreyScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", greyConfig(options));
}
/** Binding-identical American spelling of scaleFillGrey. */
export const scaleFillGray = scaleFillGrey;
/** Binding-identical alias of scaleFillDiscrete. */
export const scaleFillOrdinal = scaleFillDiscrete;

export const scaleColourHue = scaleColorHue;
export const scaleColourGrey = scaleColorGrey;
export const scaleColourGray = scaleColorGray;
export const scaleColourOrdinal = scaleColorOrdinal;
export const scale_color_hue = scaleColorHue;
export const scale_color_grey = scaleColorGrey;
export const scale_color_gray = scaleColorGray;
export const scale_color_ordinal = scaleColorOrdinal;
export const scale_colour_hue = scaleColorHue;
export const scale_colour_grey = scaleColorGrey;
export const scale_colour_gray = scaleColorGray;
export const scale_colour_ordinal = scaleColorOrdinal;
export const scale_fill_hue = scaleFillHue;
export const scale_fill_grey = scaleFillGrey;
export const scale_fill_gray = scaleFillGray;
export const scale_fill_ordinal = scaleFillOrdinal;

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
