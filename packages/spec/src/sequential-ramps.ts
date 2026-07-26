/**
 * Named sequential color ramps (10 stops each, dark → bright).
 *
 * Clean-room samples of the public viridis-family colormaps used by
 * ggplot2's scale_*_viridis_* option names. Piecewise-linear sRGB
 * interpolation in core inherits perceptual uniformity from the stops.
 *
 * Single source of truth for helpers (viridis_d bakes `range`) and core
 * scheme resolution (sequential / binned).
 */
import { SEQUENTIAL_SCHEME_NAMES } from "./schema-names.js";

export type SequentialSchemeName = (typeof SEQUENTIAL_SCHEME_NAMES)[number];

/** 10 stops sampled evenly from viridis (dark → bright). */
export const VIRIDIS_RAMP_10 = [
  "#440154",
  "#482878",
  "#3e4989",
  "#31688e",
  "#26828e",
  "#1f9e89",
  "#35b779",
  "#6ece58",
  "#b5de2b",
  "#fde725",
] as const;

export const MAGMA_RAMP_10 = [
  "#000004",
  "#1b0c41",
  "#4a0c6b",
  "#781c6d",
  "#a52c60",
  "#cf4446",
  "#ed6925",
  "#fb9b06",
  "#f7d13d",
  "#fcfdbf",
] as const;

export const PLASMA_RAMP_10 = [
  "#0d0887",
  "#46039f",
  "#7201a8",
  "#9c179e",
  "#bd3786",
  "#d8576b",
  "#ed7953",
  "#fb9f3a",
  "#fdca26",
  "#f0f921",
] as const;

export const INFERNO_RAMP_10 = [
  "#000004",
  "#1b0c41",
  "#4a0c6b",
  "#781c6d",
  "#a52c60",
  "#cf4446",
  "#ed6925",
  "#fb9a07",
  "#f7d13d",
  "#fcffa4",
] as const;

export const CIVIDIS_RAMP_10 = [
  "#00224e",
  "#123570",
  "#3b496c",
  "#575d6d",
  "#707173",
  "#8a8678",
  "#a59c74",
  "#c3b369",
  "#e1cc55",
  "#fee838",
] as const;

export const TURBO_RAMP_10 = [
  "#30123b",
  "#4662d7",
  "#36aaf9",
  "#1ae4b6",
  "#72fe5e",
  "#c8ef34",
  "#faba39",
  "#f66b19",
  "#ca2a04",
  "#7a0403",
] as const;

export const SEQUENTIAL_SCHEME_RAMPS = {
  viridis: VIRIDIS_RAMP_10,
  magma: MAGMA_RAMP_10,
  plasma: PLASMA_RAMP_10,
  inferno: INFERNO_RAMP_10,
  cividis: CIVIDIS_RAMP_10,
  turbo: TURBO_RAMP_10,
} as const satisfies Record<SequentialSchemeName, readonly string[]>;

export function sequentialSchemeRamp(scheme: string): readonly string[] | undefined {
  if (Object.hasOwn(SEQUENTIAL_SCHEME_RAMPS, scheme)) {
    return SEQUENTIAL_SCHEME_RAMPS[scheme as SequentialSchemeName];
  }
  return undefined;
}
