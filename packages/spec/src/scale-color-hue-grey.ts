/**
 * Hue / grey / ordinal color/fill scale constructors (#829).
 * Ordinal aliases bind to scaleColorDiscrete / scaleFillDiscrete (same identity).
 */
import type { Scales } from "./schema.js";
import { buildGreyPalette, buildHuePalette } from "./hue-grey-palettes.js";
import {
  colorScale,
  scaleColorDiscrete,
  scaleFillDiscrete,
  type DiscreteColorScaleOptions,
} from "./scale-color-helpers.js";

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
