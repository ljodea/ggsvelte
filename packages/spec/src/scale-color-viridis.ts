/**
 * Viridis family color/fill scale constructors (#828).
 * ggplot2 scale_*_viridis_{c,d,b}. Helper-only fields `option` and `direction`
 * are stripped before PortableSpec; `begin`/`end` deferred.
 */
import type { Scales } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema-names.js";
import {
  colorScale,
  type ColorScaleOptions,
  type DiscreteColorScaleOptions,
  type SequentialColorScaleOptions,
} from "./scale-color-helpers.js";

type SequentialSchemeName = (typeof SEQUENTIAL_SCHEME_NAMES)[number];

export type ViridisOptionName = SequentialSchemeName;

/** Shared option surface for scale_*_viridis_* constructors. */
export type ViridisScaleOptions = {
  /** Viridis-family map name (default `"viridis"`). Maps to PortableSpec `scheme`. */
  option?: ViridisOptionName;
  /**
   * ggplot2 direction: `1` (default) dark→bright, `-1` reverses the ramp.
   * Emitted as PortableSpec `reverse: true` when `-1`.
   */
  direction?: 1 | -1;
  reverse?: boolean;
  domain?: SequentialColorScaleOptions["domain"];
  range?: SequentialColorScaleOptions["range"];
  breaks?: SequentialColorScaleOptions["breaks"];
  labels?: SequentialColorScaleOptions["labels"];
  oob?: SequentialColorScaleOptions["oob"];
  naValue?: SequentialColorScaleOptions["naValue"];
  unknownValue?: SequentialColorScaleOptions["unknownValue"];
  guide?: SequentialColorScaleOptions["guide"];
  transform?: SequentialColorScaleOptions["transform"];
  domainMode?: DiscreteColorScaleOptions["domainMode"];
  onExhaust?: DiscreteColorScaleOptions["onExhaust"];
};

const VIRIDIS_OPTIONS = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

function resolveViridisPortable(options: ViridisScaleOptions): ColorScaleOptions {
  const { option, direction, reverse, ...rest } = options;
  if (option !== undefined && !VIRIDIS_OPTIONS.has(option)) {
    throw new Error(
      `Unknown viridis option "${option}". Expected one of: ${SEQUENTIAL_SCHEME_NAMES.join(", ")}.`,
    );
  }
  const out: ColorScaleOptions = {
    scheme: option ?? "viridis",
  };
  if (rest.domain !== undefined) out.domain = rest.domain;
  if (rest.range !== undefined) out.range = rest.range;
  if (rest.breaks !== undefined) out.breaks = rest.breaks;
  if (rest.labels !== undefined) out.labels = rest.labels;
  if (rest.oob !== undefined) out.oob = rest.oob;
  if (rest.naValue !== undefined) out.naValue = rest.naValue;
  if (rest.unknownValue !== undefined) out.unknownValue = rest.unknownValue;
  if (rest.guide !== undefined) out.guide = rest.guide;
  if (rest.transform !== undefined) out.transform = rest.transform;
  if (rest.domainMode !== undefined) out.domainMode = rest.domainMode;
  if (rest.onExhaust !== undefined) out.onExhaust = rest.onExhaust;
  if (reverse === true || direction === -1) out.reverse = true;
  return out;
}

export function scaleColorViridisC(options: ViridisScaleOptions = {}): Scales {
  return colorScale("color", "sequential", resolveViridisPortable(options));
}
export function scaleColorViridisD(options: ViridisScaleOptions = {}): Scales {
  return colorScale("color", "ordinal", resolveViridisPortable(options));
}
export function scaleColorViridisB(options: ViridisScaleOptions = {}): Scales {
  return colorScale("color", "binned", resolveViridisPortable(options));
}
export function scaleFillViridisC(options: ViridisScaleOptions = {}): Scales {
  return colorScale("fill", "sequential", resolveViridisPortable(options));
}
export function scaleFillViridisD(options: ViridisScaleOptions = {}): Scales {
  return colorScale("fill", "ordinal", resolveViridisPortable(options));
}
export function scaleFillViridisB(options: ViridisScaleOptions = {}): Scales {
  return colorScale("fill", "binned", resolveViridisPortable(options));
}

export const scaleColourViridisC = scaleColorViridisC;
export const scaleColourViridisD = scaleColorViridisD;
export const scaleColourViridisB = scaleColorViridisB;
export const scale_color_viridis_c = scaleColorViridisC;
export const scale_color_viridis_d = scaleColorViridisD;
export const scale_color_viridis_b = scaleColorViridisB;
export const scale_colour_viridis_c = scaleColorViridisC;
export const scale_colour_viridis_d = scaleColorViridisD;
export const scale_colour_viridis_b = scaleColorViridisB;
export const scale_fill_viridis_c = scaleFillViridisC;
export const scale_fill_viridis_d = scaleFillViridisD;
export const scale_fill_viridis_b = scaleFillViridisB;
