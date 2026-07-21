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
import { ScaleConfigError } from "./scale-error.js";
import type { PositionTransformName, ScaleTransform } from "./transform.js";
import { scaleTransform } from "./transform.js";
import type { ScaleState, ScaleWarning, TrainResult } from "./state.js";
import { encodeKey, trainDiscrete } from "./state.js";

// Re-export for callers that import ScaleConfigError from ./train.js.
export { ScaleConfigError } from "./scale-error.js";

import { CATEGORICAL_PALETTE_10, CATEGORICAL_SCHEMES } from "./categorical-palettes.js";

// Stable public path: re-export palettes so index/editions/tests keep
// importing from ./scales/train.js (same ES binding for identity === checks).
export {
  CATEGORICAL_PALETTE_10,
  CATEGORICAL_SCHEMES,
  COLORBLIND_PALETTE,
  FLEXOKI_PALETTE,
  IPSUM_PALETTE,
  TABLEAU10_PALETTE,
} from "./categorical-palettes.js";

function rangeForScheme(scheme: string | undefined): readonly string[] | undefined {
  if (scheme === "viridis") return VIRIDIS_RAMP_10;
  if (scheme === undefined) return undefined;
  return CATEGORICAL_SCHEMES[scheme as keyof typeof CATEGORICAL_SCHEMES];
}

export interface ContinuousScale {
  type: "linear" | "time";
  /** Pre-stat transform applied to source values before affine training. */
  transform: PositionTransformName;
  /** Semantic/source-space display domain [min, max] (epoch ms for time). */
  domain: [number, number];
  /** Post-stat scale-space display domain [min, max] (forward(domain)). */
  transformedDomain: [number, number];
  /** Semantic value -> forward -> affine [0, 1]. NaN outside the transform
   *  domain (e.g. non-positive on log10). Reverse is applied here. */
  normalize(value: number): number;
  /** Post-stat scale-space value -> affine [0, 1]. Geometry uses this so a
   *  transformed frame value is never forwarded twice. Reverse applied. */
  normalizeTransformed(value: number): number;
  /** Inverse of normalize: affine [0, 1] -> inverse -> semantic value
   *  (brush-to-zoom inversion). Mirrors reverse. */
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

/** Display expansion split per end, applied in transformed space. */
interface TransformedExpansion {
  lowerMult: number;
  upperMult: number;
  lowerAdd: number;
  upperAdd: number;
}

const NO_EXPANSION: TransformedExpansion = { lowerMult: 0, upperMult: 0, lowerAdd: 0, upperAdd: 0 };

export interface ContinuousConfig {
  type?: "linear" | "time";
  /** Pre-stat transform (default identity). Time forces identity. */
  transform?: ScaleTransform;
  /** Explicit [min, max] SEMANTIC domain (epoch ms for time) — PINS the scale. */
  domain?: [number, number];
  nice?: boolean;
  zero?: boolean;
  reverse?: boolean;
  /** Display expansion in transformed space (default: none). */
  expansion?: TransformedExpansion;
}

export interface ContinuousTraining {
  scale: ContinuousScale;
  /** True when no finite data trained the scale. */
  empty: boolean;
  /** Retained for the warning channel; transform-domain drops are counted
   *  pre-stat by the column transform, so the trainer reports 0. */
  nonPositive: number;
}

/**
 * Train a continuous positional scale in TRANSFORMED space. `arrays` are the
 * post-stat transformed (scale-space) evidence: the affine domain is trained
 * over them, nice/zero apply in transformed space, expansion pads after nice,
 * and the public semantic `domain` is the inverse-projection of the expanded
 * transformed endpoints. `normalize` forwards a semantic value before the
 * affine map; `normalizeTransformed` skips the forward (geometry uses it).
 */
export function trainContinuous(
  arrays: readonly Float64Array[],
  config: ContinuousConfig = {},
): ContinuousTraining {
  const type = config.type ?? "linear";
  const transform = config.transform ?? scaleTransform("identity");
  const reverse = config.reverse === true;
  const expansion = config.expansion ?? NO_EXPANSION;
  const pinned = config.domain !== undefined;
  const nice = config.nice !== false && !pinned && type !== "time";

  const extent = finiteExtent(arrays);
  let t0: number;
  let t1: number;
  if (pinned) {
    const [lo, hi] = config.domain!;
    if (!transform.valid(lo) || !transform.valid(hi)) {
      throw new ScaleConfigError(
        "scale-transform-domain",
        `A ${transform.key} scale's explicit domain must lie in the transform's valid range ` +
          `(got [${lo}, ${hi}]). Use values inside the domain, or a different transform.`,
      );
    }
    t0 = transform.forward(lo);
    t1 = transform.forward(hi);
  } else if (extent === null) {
    // Empty: a unit transformed window; inverse gives a sensible semantic span.
    t0 = 0;
    t1 = 1;
  } else {
    t0 = extent[0];
    t1 = extent[1];
    if (config.zero === true && transform.valid(0)) {
      const zeroT = transform.forward(0);
      t0 = Math.min(t0, zeroT);
      t1 = Math.max(t1, zeroT);
    }
    if (type === "time") {
      if (t0 === t1) {
        t0 -= 43_200_000;
        t1 += 43_200_000;
      }
    } else if (nice) {
      [t0, t1] = niceLinearDomain(t0, t1);
    } else if (t0 === t1) {
      t0 -= 0.5;
      t1 += 0.5;
    }
  }

  // Display expansion in transformed space (after nice; pinned domains too).
  const innerSpan = t1 - t0;
  const e0 = t0 - expansion.lowerMult * innerSpan - expansion.lowerAdd;
  const e1 = t1 + expansion.upperMult * innerSpan + expansion.upperAdd;
  const span = e1 - e0;
  const affine = (transformed: number): number => {
    const raw = span === 0 ? 0.5 : (transformed - e0) / span;
    return reverse ? 1 - raw : raw;
  };
  return {
    scale: {
      type,
      transform: transform.key,
      domain: [transform.inverse(e0), transform.inverse(e1)],
      transformedDomain: [e0, e1],
      normalize: (value: number) =>
        transform.valid(value) ? affine(transform.forward(value)) : Number.NaN,
      normalizeTransformed: (value: number) => affine(value),
      invert: (t: number) => {
        const a = reverse ? 1 - t : t;
        return transform.inverse(e0 + a * span);
      },
    },
    empty: extent === null && !pinned,
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
