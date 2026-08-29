/**
 * Generic non-position color/fill scale helpers + ColorBrewer (#825) +
 * configuredColorScaleType. Palette families live in sibling modules:
 * scale-color-viridis.ts, scale-color-stops.ts (gradient + steps),
 * scale-color-hue-grey.ts. Facade re-exports: scale-helpers.ts.
 */

import type { ColorScaleSpec, Scales } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema-names.js";

const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

/** Resolve family intent encoded by family-specific options before data inference. */
export function configuredColorScaleType(
  config: ColorScaleSpec | undefined,
): ColorScaleSpec["type"] | undefined {
  if (config === undefined) return undefined;
  if (config.type !== undefined) return config.type;
  if (config.scheme !== undefined && config.range === undefined) {
    return SEQUENTIAL_SCHEMES.has(config.scheme) ? "sequential" : "ordinal";
  }
  const sequentialOptions = [
    config.transform,
    config.temporalKind,
    config.parse,
    config.parseFailure,
    config.timezone,
    config.disambiguation,
    config.breaks,
    config.oob,
    config.labels,
  ];
  if (sequentialOptions.some((value) => value !== undefined)) {
    return "sequential";
  }
  if (config.domainMode !== undefined || config.onExhaust !== undefined) return "ordinal";
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

/** Shared PortableSpec builder for color/fill scale helpers (sibling modules). */
export function colorScale(
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

/** ggplot2 palette + direction options for ColorBrewer helpers (#825). */
export type ColorBrewerScaleOptions = DiscreteColorScaleOptions & {
  /** ColorBrewer palette name (e.g. "Dark2", "Blues"). Maps to `scheme`. */
  palette?: string;
  /** `1` (default) or `-1` (reverse). */
  direction?: 1 | -1;
};

export type ColorDistillerScaleOptions = SequentialColorScaleOptions & {
  palette?: string;
  direction?: 1 | -1;
};

export type ColorFermenterScaleOptions = BinnedColorScaleOptions & {
  palette?: string;
  direction?: 1 | -1;
};

function withBrewerPalette<T extends { scheme?: string; reverse?: boolean }>(
  options: T & { palette?: string; direction?: 1 | -1 },
): T {
  const { palette, direction, scheme, reverse, ...rest } = options;
  const resolvedScheme = palette ?? scheme;
  return {
    ...rest,
    ...(resolvedScheme === undefined ? {} : { scheme: resolvedScheme }),
    ...(direction === -1 || reverse === true ? { reverse: true } : {}),
  } as T;
}

/** ggplot2 `scale_color_brewer` — discrete ColorBrewer palette. */
export function scaleColorBrewer(options: ColorBrewerScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", withBrewerPalette(options));
}
/** ggplot2 `scale_color_distiller` — continuous ColorBrewer ramp. */
export function scaleColorDistiller(options: ColorDistillerScaleOptions = {}): Scales {
  return colorScale("color", "sequential", withBrewerPalette(options));
}
/** ggplot2 `scale_color_fermenter` — binned ColorBrewer ramp. */
export function scaleColorFermenter(options: ColorFermenterScaleOptions = {}): Scales {
  return colorScale("color", "binned", withBrewerPalette(options));
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
export const scaleColourBrewer = scaleColorBrewer;
export const scaleColourDistiller = scaleColorDistiller;
export const scaleColourFermenter = scaleColorFermenter;
export const scale_color_continuous = scaleColorContinuous;
export const scale_color_discrete = scaleColorDiscrete;
export const scale_color_binned = scaleColorBinned;
export const scale_color_log10 = scaleColorLog10;
export const scale_color_sqrt = scaleColorSqrt;
export const scale_color_date = scaleColorDate;
export const scale_color_datetime = scaleColorDatetime;
export const scale_color_manual = scaleColorManual;
export const scale_color_identity = scaleColorIdentity;
export const scale_color_brewer = scaleColorBrewer;
export const scale_color_distiller = scaleColorDistiller;
export const scale_color_fermenter = scaleColorFermenter;
export const scale_colour_continuous = scaleColorContinuous;
export const scale_colour_discrete = scaleColorDiscrete;
export const scale_colour_binned = scaleColorBinned;
export const scale_colour_log10 = scaleColorLog10;
export const scale_colour_sqrt = scaleColorSqrt;
export const scale_colour_date = scaleColorDate;
export const scale_colour_datetime = scaleColorDatetime;
export const scale_colour_manual = scaleColorManual;
export const scale_colour_identity = scaleColorIdentity;
export const scale_colour_brewer = scaleColorBrewer;
export const scale_colour_distiller = scaleColorDistiller;
export const scale_colour_fermenter = scaleColorFermenter;

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

/** ggplot2 `scale_fill_brewer`. */
export function scaleFillBrewer(options: ColorBrewerScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", withBrewerPalette(options));
}
/** ggplot2 `scale_fill_distiller`. */
export function scaleFillDistiller(options: ColorDistillerScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", withBrewerPalette(options));
}
/** ggplot2 `scale_fill_fermenter`. */
export function scaleFillFermenter(options: ColorFermenterScaleOptions = {}): Scales {
  return colorScale("fill", "binned", withBrewerPalette(options));
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
export const scale_fill_brewer = scaleFillBrewer;
export const scale_fill_distiller = scaleFillDistiller;
export const scale_fill_fermenter = scaleFillFermenter;
