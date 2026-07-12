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
  /** Data-space domain [min, max]. */
  domain: [number, number];
  /** Resolved ramp stops (post-reverse). */
  stops: readonly string[];
  /** Color for a data value (undefined for non-finite values). */
  colorOf(value: unknown): string | undefined;
  /** Color at a normalized ramp position t in [0, 1] (legend gradients). */
  at(t: number): string;
}

export interface SequentialConfig {
  /** Explicit [min, max]; wins over the data extent. */
  domain?: [number, number];
  /** Explicit ramp stops (CSS colors — must be #rrggbb for interpolation). */
  range?: readonly string[];
  reverse?: boolean;
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
  const base = config.range ?? VIRIDIS_RAMP_10;
  const stops = config.reverse === true ? base.toReversed() : [...base];
  const span = max - min;
  const at = (t: number) => rampColor(stops, t);
  return {
    type: "sequential",
    domain: [min, max],
    stops,
    at,
    colorOf(value: unknown): string | undefined {
      const v = typeof value === "number" ? value : value instanceof Date ? value.getTime() : NaN;
      if (!Number.isFinite(v)) return undefined;
      return at((v - min) / span);
    },
  };
}
