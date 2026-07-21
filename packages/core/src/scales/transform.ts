/**
 * Pure position transform registry (PR 3).
 *
 * A scale transform runs after typing/parsing and before grouping-sensitive
 * stats and positions; the final affine scale is trained in transformed space.
 * These are total, allocation-free, DOM-free maps — no eval, dynamic import,
 * regex, or callback path exists. Registry lookup is exhaustive and fails
 * safely with a stable `invalid-scale-transform` error for impossible runtime
 * input (schema-valid execution can never reach it).
 *
 * Hand-rolled like the rest of the scale math (decision records 0007/0008).
 */
import { ScaleConfigError } from "./scale-error.js";

export type PositionTransformName = "identity" | "log10" | "sqrt";

export interface ScaleTransform {
  readonly key: PositionTransformName;
  /** Semantic source value -> transformed (scale-space) value. */
  forward(value: number): number;
  /** Transformed (scale-space) value -> semantic source value. */
  inverse(value: number): number;
  /** Whether a finite source value is in the transform's valid input domain. */
  valid(value: number): boolean;
}

export const POSITION_TRANSFORM_NAMES = ["identity", "log10", "sqrt"] as const;

const identity: ScaleTransform = Object.freeze({
  key: "identity",
  forward: (value: number): number => value,
  inverse: (value: number): number => value,
  valid: (value: number): boolean => Number.isFinite(value),
});

const log10: ScaleTransform = Object.freeze({
  key: "log10",
  forward: (value: number): number => Math.log10(value),
  inverse: (value: number): number => 10 ** value,
  // strictly positive: log10 is undefined at or below zero (incl. -0).
  valid: (value: number): boolean => Number.isFinite(value) && value > 0,
});

const sqrt: ScaleTransform = Object.freeze({
  key: "sqrt",
  forward: (value: number): number => Math.sqrt(value),
  inverse: (value: number): number => value * value,
  // non-negative: sqrt is real for value >= 0 (incl. signed zero).
  valid: (value: number): boolean => Number.isFinite(value) && value >= 0,
});

const REGISTRY: Readonly<Record<PositionTransformName, ScaleTransform>> = Object.freeze({
  identity,
  log10,
  sqrt,
});

/** Look up a transform by its canonical name (type-safe callers). */
export function scaleTransform(key: PositionTransformName): ScaleTransform {
  return REGISTRY[key];
}

/**
 * How a source column becomes a transformed (scale-space) column: forward
 * transform, source-limit OOB policy, and missing/NA replacement. Precedence
 * is OOB + naValue > transform (plan).
 */
export interface ColumnTransformConfig {
  transform: ScaleTransform;
  /** Unexpanded semantic [lo, hi] source limits, or null when unpinned. */
  sourceLimits: readonly [number, number] | null;
  oob: "censor" | "squish";
  naValue: number | null;
}

export interface ColumnTransformResult {
  transformed: Float64Array;
  valid: Uint8Array;
  /** Finite values dropped by OOB censor. */
  censored: number;
  /** Finite values clamped by OOB squish. */
  squished: number;
  /** Values missing after OOB/NA that are invalid for the transform domain. */
  invalidTransform: number;
}

let columnTransformRuns = 0;

/** Test/benchmark hook: number of column-transform kernel executions so far. */
export function columnTransformRunCount(): number {
  return columnTransformRuns;
}

/** Test/benchmark hook: reset the column-transform execution counter. */
export function resetColumnTransformRunCount(): void {
  columnTransformRuns = 0;
}

/**
 * Apply OOB, NA replacement, and the forward transform to one parsed column.
 * Reads `semantic`/`valid` without mutating them and returns fresh arrays.
 * O(rows), run once per (field, parser, transform, limits, oob, naValue) key.
 */
export function executeColumnTransform(
  semantic: Float64Array,
  valid: Uint8Array,
  config: ColumnTransformConfig,
): ColumnTransformResult {
  columnTransformRuns++;
  const { transform, sourceLimits, oob, naValue } = config;
  const n = semantic.length;
  const transformed = new Float64Array(n);
  const outValid = new Uint8Array(n);
  const lo = sourceLimits === null ? 0 : sourceLimits[0];
  const hi = sourceLimits === null ? 0 : sourceLimits[1];
  let censored = 0;
  let squished = 0;
  let invalidTransform = 0;
  for (let index = 0; index < n; index++) {
    let present = valid[index] === 1;
    let candidate = present ? semantic[index]! : Number.NaN;
    // 1. OOB against the unexpanded semantic limits (finite values only).
    if (present && sourceLimits !== null) {
      if (candidate < lo) {
        if (oob === "squish") {
          candidate = lo;
          squished++;
        } else {
          present = false;
          censored++;
        }
      } else if (candidate > hi) {
        if (oob === "squish") {
          candidate = hi;
          squished++;
        } else {
          present = false;
          censored++;
        }
      }
    }
    // 2. NA replacement of missing/censored values (checked against the
    //    transform domain below like any other value).
    if (!present && naValue !== null) {
      candidate = naValue;
      present = true;
    }
    if (!present) {
      transformed[index] = Number.NaN;
      continue;
    }
    // 3. Transform validity. OOB cannot rescue an invalid transform input
    //    unless the clamp target itself lies in the valid domain.
    if (!transform.valid(candidate)) {
      transformed[index] = Number.NaN;
      invalidTransform++;
      continue;
    }
    transformed[index] = transform.forward(candidate);
    outValid[index] = 1;
  }
  return { transformed, valid: outValid, censored, squished, invalidTransform };
}

/**
 * Exhaustive lookup for runtime-provided keys. Schema validation already
 * bounds the enum, so this is a fail-safe: an impossible key throws a stable
 * `invalid-scale-transform` error rather than returning undefined.
 */
export function getScaleTransform(key: string): ScaleTransform {
  const transform = (REGISTRY as Record<string, ScaleTransform | undefined>)[key];
  if (transform === undefined) {
    throw new ScaleConfigError(
      "invalid-scale-transform",
      `Unknown scale transform "${key}". Expected one of: ${POSITION_TRANSFORM_NAMES.join(", ")}.`,
    );
  }
  return transform;
}
