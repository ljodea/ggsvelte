/**
 * Jitter and nudge position adjustments (point/text layers).
 *
 * Jitter is ALWAYS SEEDED (params.seed, default 42, mulberry32): the same
 * spec renders the same pixels on every run and platform — a deliberate
 * reproducibility divergence from ggplot2, whose jitter is random per draw
 * unless a seed is passed (the pipeline emits the `jitter-seeded` advisory;
 * decision 0010). Offsets are uniform in [−amount, +amount] with amount
 * defaulting to 40% of the data resolution, ggplot2's rule; all x offsets
 * draw before all y offsets.
 *
 * Offset units (both adjustments): DATA units on continuous scales,
 * BAND-STEP fractions on discrete scales (where one step = the distance
 * between adjacent bands, ggplot2's discrete resolution of 1).
 *
 * Nudge applies a constant (params.x / params.y) offset per row.
 */
import { mulberry32, resolution } from "../stats/numeric.js";

export const DEFAULT_JITTER_SEED = 42;

export interface JitterInput {
  /** Row count. */
  n: number;
  /** Explicit amounts (data units / band fractions); default 0.4·resolution. */
  width?: number | undefined;
  height?: number | undefined;
  seed?: number | undefined;
  /** Numeric x values for the resolution default (null = discrete, res 1). */
  xNumeric: Float64Array | null;
  yNumeric: Float64Array | null;
}

export interface OffsetResult {
  dx: Float64Array;
  dy: Float64Array;
}

/** Seeded uniform jitter offsets (x stream first, then y — deterministic). */
export function jitterOffsets(input: JitterInput): OffsetResult {
  const { n } = input;
  const rnd = mulberry32(input.seed ?? DEFAULT_JITTER_SEED);
  const w = input.width ?? 0.4 * (input.xNumeric === null ? 1 : resolution(input.xNumeric));
  const h = input.height ?? 0.4 * (input.yNumeric === null ? 1 : resolution(input.yNumeric));
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  for (let i = 0; i < n; i++) dx[i] = w === 0 ? 0 : (rnd() * 2 - 1) * w;
  for (let i = 0; i < n; i++) dy[i] = h === 0 ? 0 : (rnd() * 2 - 1) * h;
  return { dx, dy };
}

/** Constant nudge offsets. */
export function nudgeOffsets(n: number, x: number, y: number): OffsetResult {
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  dx.fill(x);
  dy.fill(y);
  return { dx, dy };
}
