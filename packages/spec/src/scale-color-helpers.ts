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

// --- hue / grey / ordinal constructors (#829) -------------------------------
// ggplot2 scale_*_hue, scale_*_grey/gray, scale_*_ordinal. Fixed 10-stop
// schemes for grow stability; non-default params require explicit domain so
// the palette materialises into PortableSpec.range.

export type HueScaleOptions = DiscreteColorScaleOptions & {
  /** Hue wheel [start°, end°) in HCL. Default [15, 375]. */
  h?: readonly [number, number];
  /** HCL chroma. Default 100. */
  c?: number;
  /** HCL luminance. Default 65. */
  l?: number;
};

export type GreyScaleOptions = DiscreteColorScaleOptions & {
  /** Relative luminance start in [0, 1]. Default 0.2. */
  start?: number;
  /** Relative luminance end in [0, 1]. Default 0.8. */
  end?: number;
};

const HUE_H0 = 15;
const HUE_H1 = 375;
const HUE_C = 100;
const HUE_L = 65;
const GREY_START = 0.2;
const GREY_END = 0.8;

function arraysClose(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Materialise a custom hue palette when domain is known; otherwise emit
 * scheme "hue" with defaults only.
 */
function resolveHueOptions(options: HueScaleOptions): DiscreteColorScaleOptions {
  const { h, c, l, domain, scheme: _scheme, range: _range, ...rest } = options;
  const hRange = h ?? ([HUE_H0, HUE_H1] as const);
  const chroma = c ?? HUE_C;
  const lum = l ?? HUE_L;
  const isDefault = arraysClose(hRange, [HUE_H0, HUE_H1]) && chroma === HUE_C && lum === HUE_L;
  if (domain !== undefined) {
    return {
      ...rest,
      domain: [...domain],
      range: authoringHuePalette(domain.length, hRange, chroma, lum),
    };
  }
  if (!isDefault) {
    throw new Error(
      "Non-default hue parameters (h, c, l) require an explicit domain so the palette can be written to PortableSpec.range.",
    );
  }
  return { ...rest, scheme: "hue" };
}

function resolveGreyOptions(options: GreyScaleOptions): DiscreteColorScaleOptions {
  const { start, end, domain, scheme: _scheme, range: _range, ...rest } = options;
  const s = start ?? GREY_START;
  const e = end ?? GREY_END;
  const isDefault = s === GREY_START && e === GREY_END;
  if (domain !== undefined) {
    return {
      ...rest,
      domain: [...domain],
      range: authoringGreyPalette(domain.length, s, e),
    };
  }
  if (!isDefault) {
    throw new Error(
      "Non-default grey parameters (start, end) require an explicit domain so the palette can be written to PortableSpec.range.",
    );
  }
  return { ...rest, scheme: "grey" };
}

// Spec must not import @ggsvelte/core (dependency direction). Formulas mirror
// packages/core/src/scales/hue-grey-palettes.ts for authoring-time ranges.

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
function toHexByte(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}
function linearToSrgb(u: number): number {
  const v = clamp01(u);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}
function hclToHex(h: number, c: number, l: number): string {
  const hr = ((h % 360) * Math.PI) / 180;
  const a = Math.cos(hr) * c;
  const b = Math.sin(hr) * c;
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;
  const x3 = x ** 3;
  const y3 = y ** 3;
  const z3 = z ** 3;
  const xr = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
  const yr = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
  const zr = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;
  const X = xr * 0.95047;
  const Y = yr * 1.0;
  const Z = zr * 1.08883;
  const rLin = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  const gLin = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  const bLin = X * 0.0557 + Y * -0.204 + Z * 1.057;
  return rgbToHex(linearToSrgb(rLin) * 255, linearToSrgb(gLin) * 255, linearToSrgb(bLin) * 255);
}
function authoringHuePalette(
  k: number,
  h: readonly [number, number] = [HUE_H0, HUE_H1],
  c: number = HUE_C,
  l: number = HUE_L,
): string[] {
  if (k <= 0) return [];
  const [h0, h1] = h;
  const span = h1 - h0;
  if (k === 1) return [hclToHex(h0 + span / 2, c, l)];
  return Array.from({ length: k }, (_, i) => hclToHex(h0 + (span * i) / k, c, l));
}
function authoringGreyPalette(
  k: number,
  start: number = GREY_START,
  end: number = GREY_END,
): string[] {
  if (k <= 0) return [];
  if (k === 1) {
    const g = Math.round(clamp01((start + end) / 2) * 255);
    return [rgbToHex(g, g, g)];
  }
  return Array.from({ length: k }, (_, i) => {
    const t = i / (k - 1);
    const g = Math.round(clamp01(start + (end - start) * t) * 255);
    return rgbToHex(g, g, g);
  });
}

export function scaleColorHue(options: HueScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", resolveHueOptions(options));
}
export function scaleColorGrey(options: GreyScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", resolveGreyOptions(options));
}
/** American spelling alias for {@link scaleColorGrey}. */
export const scaleColorGray = scaleColorGrey;
/** Ordered discrete colour — binding-identical to {@link scaleColorDiscrete}. */
export const scaleColorOrdinal = scaleColorDiscrete;

export function scaleFillHue(options: HueScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", resolveHueOptions(options));
}
export function scaleFillGrey(options: GreyScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", resolveGreyOptions(options));
}
export const scaleFillGray = scaleFillGrey;
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
