/**
 * Continuous (sequential) color scales for quantitative color/fill mappings.
 *
 * The default ramp is a small viridis-like table (10 stops sampled from the
 * viridis colormap — decision 0008: a lookup table with piecewise-linear sRGB
 * interpolation, no d3-scale-chromatic dependency; perceptual uniformity is
 * inherited from the sampled stops, not re-derived).
 */

/** 10 stops sampled evenly from the viridis colormap (dark -> bright). */
export const VIRIDIS_RAMP_10: readonly string[] = [
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
];

export function normalizeColor(stop: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(stop);
  if (match === null) {
    throw new RangeError(`Sequential color stops must use #rgb or #rrggbb syntax (got "${stop}").`);
  }
  const digits = match[1]!.toLowerCase();
  return digits.length === 3
    ? `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
    : `#${digits}`;
}

function hexChannel(hex: string, i: number): number {
  return Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

const to2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/**
 * Piecewise-linear interpolation over evenly spaced #rrggbb stops.
 * t is clamped to [0, 1]; output is a deterministic lowercase #rrggbb.
 */
export function rampColor(stops: readonly string[], t: number): string {
  const n = stops.length;
  if (n === 1) return stops[0]!;
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (n - 1);
  const i = Math.min(n - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  let out = "#";
  for (let c = 0; c < 3; c++) {
    out += to2(hexChannel(a, c) + (hexChannel(b, c) - hexChannel(a, c)) * f);
  }
  return out;
}

export interface SequentialColorScale {
  type: "sequential";
  /** Semantic/source-space domain [min, max] (epoch ms for temporal values). */
  domain: [number, number];
  /** Transform-space affine domain used to interpolate the ramp. */
  transformedDomain: [number, number];
  transform: "identity" | "log10" | "sqrt";
  reverse: boolean;
  /** Resolved ramp stops (post-reverse). */
  stops: readonly string[];
  naValue: string;
  unknownValue: string;
  /** Color for a semantic value, including explicit NA/OOB fallbacks. */
  colorOf(value: unknown): string | undefined;
  /** Color at a normalized ramp position t in [0, 1] (legend gradients). */
  at(t: number): string;
  /** True when the numeric domain contains semantic epoch milliseconds. */
  temporal?: boolean;
  temporalKind?: "date" | "datetime";
  /** Explicit semantic guide breaks, when authored. */
  guideBreaks?: readonly number[];
}

export interface SequentialConfig {
  /** Explicit [min, max]; wins over the data extent. */
  domain?: [number, number];
  /** Explicit ramp stops (#rgb or #rrggbb; normalized before interpolation). */
  range?: readonly string[];
  reverse?: boolean;
  transform?: "identity" | "log10" | "sqrt";
  oob?: "censor" | "squish";
  naValue?: string;
  unknownValue?: string;
}

/**
 * Train a sequential color scale over a data extent. Zero-variance domains
 * pad symmetrically (matching the positional-scale failure policy).
 */
export function trainSequential(
  extent: [number, number] | null,
  config: SequentialConfig = {},
): SequentialColorScale {
  let [min, max] = config.domain ?? extent ?? [0, 1];
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const transform = config.transform ?? "identity";
  const forward = (value: number): number => {
    if (transform === "log10") return value > 0 ? Math.log10(value) : Number.NaN;
    if (transform === "sqrt") return value >= 0 ? Math.sqrt(value) : Number.NaN;
    return value;
  };
  const transformedMin = forward(min);
  const transformedMax = forward(max);
  if (!Number.isFinite(transformedMin) || !Number.isFinite(transformedMax)) {
    throw new RangeError(
      `Sequential color domain [${String(min)}, ${String(max)}] is invalid for ${transform}.`,
    );
  }
  const base = (config.range ?? VIRIDIS_RAMP_10).map((stop) => normalizeColor(stop));
  const stops = config.reverse === true ? base.toReversed() : [...base];
  const span = transformedMax - transformedMin;
  const at = (t: number) => rampColor(stops, t);
  const naValue = normalizeColor(config.naValue ?? "#999999");
  const unknownValue = normalizeColor(config.unknownValue ?? "#999999");
  return {
    type: "sequential",
    domain: [min, max],
    transformedDomain: [transformedMin, transformedMax],
    transform,
    reverse: config.reverse === true,
    stops,
    naValue,
    unknownValue,
    at,
    colorOf(value: unknown): string | undefined {
      if (value === null || value === undefined) {
        return config.naValue === undefined ? undefined : naValue;
      }
      let semantic =
        typeof value === "number" ? value : value instanceof Date ? value.getTime() : Number.NaN;
      if (!Number.isFinite(semantic)) {
        return config.unknownValue === undefined ? undefined : unknownValue;
      }
      const lower = Math.min(min, max);
      const upper = Math.max(min, max);
      if (semantic < lower || semantic > upper) {
        if (config.oob !== "squish") {
          return config.unknownValue === undefined ? undefined : unknownValue;
        }
        semantic = Math.min(upper, Math.max(lower, semantic));
      }
      const transformed = forward(semantic);
      if (!Number.isFinite(transformed)) {
        return config.unknownValue === undefined ? undefined : unknownValue;
      }
      return at(span === 0 ? 0.5 : (transformed - transformedMin) / span);
    },
  };
}
