/**
 * Positional scale training: linear / log / time (continuous, config-aware)
 * and band (discrete), plus the value-stable categorical color scale built on
 * scales/state.ts.
 *
 * Hand-rolled mapping math (no d3-scale — decision records 0007/0008).
 *
 * Config semantics (the spec's `scales` surface):
 *  - `domain` PINS a scale (nice/zero are ignored; out-of-domain values fall
 *    outside [0,1] and rows drop at geometry time for band scales).
 *  - `nice` (default true) rounds continuous domains to tick-friendly bounds
 *    (log: whole powers of ten; time: never niced — calendar ticks handle it).
 *  - `zero` extends the domain to include 0 (bars/areas force it upstream).
 *  - `reverse` flips the output direction inside normalize() so geometry and
 *    axes both see it.
 *  - log scales REFUSE non-positive domains (ScaleConfigError; the pipeline
 *    wraps it in a structured PipelineError) and drop non-positive data
 *    values with a warning (failure policy).
 */
import { tickStep } from "../layout/ticks.js";
import { VIRIDIS_RAMP_10 } from "./color.js";
import type { ScaleState, ScaleWarning, TrainResult } from "./state.js";
import { encodeKey, trainDiscrete } from "./state.js";

/**
 * Default categorical palette: 10 colors in the Observable 10 family.
 * The palette is a plain value — its fingerprint (not its identity) keys
 * scale-state invalidation.
 */
export const CATEGORICAL_PALETTE_10: readonly string[] = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e",
  "#9498a0",
];

/** hrbrthemes::ipsum_palette, in its published source order. */
export const IPSUM_PALETTE: readonly string[] = [
  "#d18975",
  "#8fd175",
  "#3f2d54",
  "#75b8d1",
  "#2d543d",
  "#c9d175",
  "#d1ab75",
  "#d175b8",
  "#758bd1",
];

/** hrbrthemes::flexoki_light, the light-background qualitative palette. */
export const FLEXOKI_PALETTE: readonly string[] = [
  "#D14D41",
  "#DA702C",
  "#D0A215",
  "#879A39",
  "#3AA99F",
  "#4385BE",
  "#8B7EC8",
  "#CE5D97",
];

/** ggthemes' regular "Tableau 10" palette. */
export const TABLEAU10_PALETTE: readonly string[] = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
];

/** ggthemes' eight-color qualitative colorblind-safe palette. */
export const COLORBLIND_PALETTE: readonly string[] = [
  "#000000",
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

/** Named categorical schemes accepted by the portable spec. */
export const CATEGORICAL_SCHEMES = {
  observable10: CATEGORICAL_PALETTE_10,
  ipsum: IPSUM_PALETTE,
  flexoki: FLEXOKI_PALETTE,
  tableau10: TABLEAU10_PALETTE,
  colorblind: COLORBLIND_PALETTE,
} as const satisfies Readonly<Record<string, readonly string[]>>;

function rangeForScheme(scheme: string | undefined): readonly string[] | undefined {
  if (scheme === "viridis") return VIRIDIS_RAMP_10;
  if (scheme === undefined) return undefined;
  return CATEGORICAL_SCHEMES[scheme as keyof typeof CATEGORICAL_SCHEMES];
}

/** A misconfigured scale (bad explicit domain, log over zero/negatives). */
export class ScaleConfigError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ScaleConfigError";
    this.code = code;
  }
}

export interface ContinuousScale {
  type: "linear" | "log" | "time";
  /** Resolved [min, max] domain (epoch ms for time). */
  domain: [number, number];
  /** Normalize a data value to [0, 1] within the domain (NaN when undefined,
   *  e.g. non-positive values on a log scale). Reverse is applied here. */
  normalize(value: number): number;
  /** Inverse of normalize: [0, 1] -> data value (brush-to-zoom inversion).
   *  Mirrors reverse; log scales invert through the exponent. */
  invert(t: number): number;
}

export interface BandScale {
  type: "band";
  /** Presentation labels for categories, parallel to `rawDomain`. */
  domain: readonly string[];
  /** Typed categories: pinned (explicit domain) or present first-seen order. */
  rawDomain: readonly unknown[];
  /** Band index of a value (undefined = not in the domain). */
  indexOf(value: unknown): number | undefined;
  /** Center of a band in [0, 1] (undefined = not in the domain). */
  normalize(value: unknown): number | undefined;
  /** Width of one band step in [0, 1] units. */
  step: number;
}

export type PositionScale = ContinuousScale | BandScale;

export interface ColorScale {
  type: "ordinal";
  /** Present domain values in stable assignment order. */
  domain: readonly unknown[];
  /**
   * Assignment rank of a value (undefined = unknown). O(1) via the training
   * encodeKey map — same keying as `colorOf`, not presentation `bandKey`.
   */
  indexOf(value: unknown): number | undefined;
  /** Resolved color for a value (undefined = unknown). */
  colorOf(value: unknown): string | undefined;
  /** Serializable value-stable state — commit only for the latest run. */
  state: ScaleState;
  warnings: ScaleWarning[];
}

/** d3-style nice: expand [min, max] to tick-step-aligned bounds. */
export function niceLinearDomain(min: number, max: number, count = 10): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    // Zero-variance domain: ggplot2-style symmetric padding.
    return niceLinearDomain(min - 0.5, max + 0.5, count);
  }
  let lo = min;
  let hi = max;
  // Two rounds, like d3-scale's nice(): the step can change after widening.
  for (let i = 0; i < 2; i++) {
    const step = tickStep(lo, hi, count);
    if (!Number.isFinite(step) || step <= 0) break;
    lo = Math.floor(min / step) * step;
    hi = Math.ceil(max / step) * step;
  }
  return [lo, hi];
}

/** Finite extent of possibly-NaN numeric arrays. Returns null when empty. */
export function finiteExtent(arrays: readonly Float64Array[]): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const array of arrays) {
    for (let i = 0; i < array.length; i++) {
      const v = array[i]!;
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return min > max ? null : [min, max];
}

/** Extent restricted to positive values; also counts non-positive finites. */
function positiveExtent(arrays: readonly Float64Array[]): {
  extent: [number, number] | null;
  nonPositive: number;
} {
  let min = Infinity;
  let max = -Infinity;
  let nonPositive = 0;
  for (const array of arrays) {
    for (let i = 0; i < array.length; i++) {
      const v = array[i]!;
      if (!Number.isFinite(v)) continue;
      if (v <= 0) {
        nonPositive++;
        continue;
      }
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { extent: min > max ? null : [min, max], nonPositive };
}

export interface ContinuousConfig {
  type?: "linear" | "log" | "time";
  /** Explicit [min, max] (epoch ms for time) — PINS the scale. */
  domain?: [number, number];
  nice?: boolean;
  zero?: boolean;
  reverse?: boolean;
}

export interface ContinuousTraining {
  scale: ContinuousScale;
  /** True when no finite (log: positive) data trained the scale. */
  empty: boolean;
  /** Count of finite but non-positive values a log scale will drop. */
  nonPositive: number;
}

/** Train a continuous positional scale (linear / log / time). */
export function trainContinuous(
  arrays: readonly Float64Array[],
  config: ContinuousConfig = {},
): ContinuousTraining {
  const type = config.type ?? "linear";
  const reverse = config.reverse === true;
  const nice = config.nice !== false && config.domain === undefined;

  if (type === "log") {
    const { extent, nonPositive } = positiveExtent(arrays);
    let domain: [number, number];
    if (config.domain !== undefined) {
      const [d0, d1] = config.domain;
      if (!(d0 > 0) || !(d1 > 0)) {
        throw new ScaleConfigError(
          "log-domain-not-positive",
          `A log scale's domain must be strictly positive (got [${d0}, ${d1}]). ` +
            "Use a linear scale, or restrict the domain to positive values.",
        );
      }
      domain = [d0, d1];
    } else if (extent === null) {
      domain = [1, 10];
    } else {
      domain = extent[0] === extent[1] ? [extent[0] / 10, extent[1] * 10] : extent;
      if (nice) {
        domain = [10 ** Math.floor(Math.log10(domain[0])), 10 ** Math.ceil(Math.log10(domain[1]))];
      }
    }
    const l0 = Math.log10(domain[0]);
    const l1 = Math.log10(domain[1]);
    const span = l1 - l0;
    return {
      scale: {
        type: "log",
        domain,
        normalize: (value: number) => {
          if (!(value > 0)) return NaN;
          const t = span === 0 ? 0.5 : (Math.log10(value) - l0) / span;
          return reverse ? 1 - t : t;
        },
        invert: (t: number) => 10 ** (l0 + (reverse ? 1 - t : t) * span),
      },
      empty: extent === null && config.domain === undefined,
      nonPositive,
    };
  }

  const extent = finiteExtent(arrays);
  let domain: [number, number];
  if (config.domain !== undefined) {
    domain = [config.domain[0], config.domain[1]];
  } else if (extent === null) {
    domain = [0, 1];
  } else {
    let [lo, hi] = extent;
    if (config.zero === true) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    if (type === "time") {
      // Time domains are never niced (calendar ticks handle alignment);
      // zero-variance pads by half a day.
      domain = lo === hi ? [lo - 43_200_000, hi + 43_200_000] : [lo, hi];
    } else {
      domain = nice ? niceLinearDomain(lo, hi) : lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi];
    }
  }
  const [d0, d1] = domain;
  const span = d1 - d0;
  return {
    scale: {
      type,
      domain,
      normalize: (value: number) => {
        const t = span === 0 ? 0.5 : (value - d0) / span;
        return reverse ? 1 - t : t;
      },
      invert: (t: number) => d0 + (reverse ? 1 - t : t) * span,
    },
    empty: extent === null && config.domain === undefined,
    nonPositive: 0,
  };
}

/** Backwards-compatible linear training (M0c signature). */
export function trainLinear(arrays: readonly Float64Array[]): {
  scale: ContinuousScale;
  empty: boolean;
} {
  const { scale, empty } = trainContinuous(arrays);
  return { scale, empty };
}

/** Canonical string key for a band category (band domains render as labels). */
export function bandKey(value: unknown): string {
  if (value === null || value === undefined) return "(null)";
  if (value instanceof Date) return value.toISOString();
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return JSON.stringify(value) ?? "(unknown)";
  }
}

export interface BandConfig {
  /** Explicit category list — PINS the domain (out-of-domain rows drop). */
  domain?: readonly unknown[];
  reverse?: boolean;
}

/** Band scale: pinned (explicit domain) or first-seen over the present data. */
export function trainBand(
  columns: readonly (readonly unknown[])[],
  config: BandConfig = {},
): BandScale {
  const index = new Map<string, number>();
  const rawDomain: unknown[] = [];
  const add = (value: unknown): void => {
    const key = encodeKey(value);
    if (index.has(key)) return;
    index.set(key, index.size);
    rawDomain.push(value);
  };
  if (config.domain === undefined) {
    for (const column of columns) for (const value of column) add(value);
  } else {
    for (const value of config.domain) add(value);
  }
  const domain = rawDomain.map((value) => bandKey(value));
  const n = domain.length;
  const reverse = config.reverse === true;
  const indexOf = (value: unknown) => index.get(encodeKey(value));
  return {
    type: "band",
    domain: Object.freeze(domain),
    rawDomain: Object.freeze(rawDomain),
    indexOf,
    step: n === 0 ? 1 : 1 / n,
    normalize: (value: unknown) => {
      const i = indexOf(value);
      if (i === undefined || n === 0) return void 0;
      const t = (i + 0.5) / n;
      return reverse ? 1 - t : t;
    },
  };
}

/**
 * Value-stable categorical color scale (decision 0002 semantics): first-seen
 * assignment keyed by value; removing a series changes nothing else; a
 * returning series gets its old color back via `prevState`. Config wires the
 * spec surface through trainDiscrete: explicit domain = pinned mode
 * (suspends stored assignments), domainMode, scheme/range, onExhaust.
 */
export interface OrdinalColorConfig {
  domain?: readonly unknown[];
  domainMode?: "grow" | "data";
  range?: readonly string[];
  scheme?: string;
  reverse?: boolean;
  onExhaust?: "cycle" | "error";
}

export function trainColor(
  values: Iterable<unknown>,
  prevState?: ScaleState | null,
  config: OrdinalColorConfig = {},
): ColorScale {
  const baseRange = config.range ?? rangeForScheme(config.scheme) ?? CATEGORICAL_PALETTE_10;
  const range = config.reverse === true ? baseRange.toReversed() : baseRange;
  const scheme =
    config.range === undefined
      ? config.reverse === true
        ? `${config.scheme ?? "observable10"}-reversed`
        : (config.scheme ?? "observable10")
      : undefined;
  const result: TrainResult = trainDiscrete(
    values,
    {
      type: "ordinal",
      range,
      ...(scheme !== undefined && { scheme }),
      ...(config.domain !== undefined && { domain: config.domain }),
      ...(config.domainMode !== undefined && { domainMode: config.domainMode }),
      ...(config.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    },
    prevState ?? null,
  );
  return {
    type: "ordinal",
    domain: result.domain,
    indexOf: (value: unknown) => result.indexOf(value),
    colorOf: (value: unknown) => result.rangeValueOf(value) as string | undefined,
    state: result.state,
    warnings: result.warnings,
  };
}
