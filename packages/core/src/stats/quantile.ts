/**
 * stat_quantile — linear quantile regression y = a + b x (#805).
 * Clean-room public contract (ggplot2 geom_quantile / stat_quantile docs).
 *
 * Method v1: linear rq only (formula y ~ x). No rqss, no weights.
 *
 * Fit: for fixed slope b, optimal intercept is the pinball-minimizing
 * order statistic of residuals y − b·x (⌈τ n⌉-th). Optimal slope chosen
 * among pairwise slopes (LP vertex property) for n ≤ PAIRWISE_CAP;
 * otherwise derivative-bisection on the profiled pinball loss.
 */

import type { CellValue } from "../table.js";

const PAIRWISE_CAP = 150;
const DEFAULT_QUANTILES = [0.25, 0.5, 0.75] as const;
const DEFAULT_N = 80;

export interface QuantileFit {
  readonly intercept: number;
  readonly slope: number;
}

export interface StatQuantileInput {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: readonly number[];
  readonly quantiles?: readonly number[];
  readonly n?: number;
  readonly carried: Readonly<Record<string, readonly CellValue[]>>;
}

export interface StatQuantileResult {
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** Synthetic series id: one per (input group × quantile). */
  readonly groups: number[];
  /** Quantile τ for each output row. */
  readonly quantile: Float64Array;
  readonly carried: Record<string, CellValue[]>;
  readonly dropped: number;
  readonly droppedGroups: number;
}

/** Pinball / check loss ρ_τ. */
export function pinballLoss(residuals: readonly number[], tau: number): number {
  let sum = 0;
  for (const u of residuals) {
    sum += u >= 0 ? tau * u : (tau - 1) * u;
  }
  return sum;
}

/**
 * Pinball-minimizing empirical quantile: order statistic at index
 * k = clamp(ceil(τ n) − 1, 0, n−1). Deterministic on ties (left endpoint
 * of any flat optimal interval when τn is integer).
 */
export function empiricalQuantileOrderStat(values: readonly number[], tau: number): number {
  const n = values.length;
  if (n === 0) return Number.NaN;
  const sorted = values.toSorted((a, b) => a - b);
  const k = Math.min(n - 1, Math.max(0, Math.ceil(tau * n) - 1));
  return sorted[k]!;
}

function residualPinball(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
  slope: number,
  tau: number,
): { intercept: number; loss: number } {
  const residuals: number[] = [];
  for (const row of rows) {
    residuals.push(y[row]! - slope * x[row]!);
  }
  const intercept = empiricalQuantileOrderStat(residuals, tau);
  const centered = residuals.map((r) => r - intercept);
  return { intercept, loss: pinballLoss(centered, tau) };
}

function pairwiseSlopes(x: Float64Array, y: Float64Array, rows: readonly number[]): number[] {
  const slopes: number[] = [0];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const dx = x[rows[j]!]! - x[rows[i]!]!;
      if (dx === 0) continue;
      slopes.push((y[rows[j]!]! - y[rows[i]!]!) / dx);
    }
  }
  return slopes;
}

/** Sign of profiled pinball derivative wrt slope (for bisection). */
function slopeSubgradientSign(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
  slope: number,
  tau: number,
): number {
  const { intercept } = residualPinball(x, y, rows, slope, tau);
  // d/db ρ_τ(y − a − b x) = −x · (τ − 1{r < 0}) with care at zero residuals.
  let g = 0;
  for (const row of rows) {
    const r = y[row]! - intercept - slope * x[row]!;
    const xv = x[row]!;
    if (r < -1e-12) g += -(tau - 1) * xv;
    else if (r > 1e-12) g += -tau * xv;
    else g += -(tau - 0.5) * xv; // midpoint of subgradient interval at kink
  }
  if (Math.abs(g) < 1e-10) return 0;
  return g > 0 ? 1 : -1;
}

function fitByPairwise(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
  tau: number,
): QuantileFit {
  let bestSlope = 0;
  let best = residualPinball(x, y, rows, 0, tau);
  for (const slope of pairwiseSlopes(x, y, rows)) {
    const cand = residualPinball(x, y, rows, slope, tau);
    if (cand.loss < best.loss - 1e-15) {
      best = cand;
      bestSlope = slope;
    }
  }
  return { intercept: best.intercept, slope: bestSlope };
}

function fitByBisection(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
  tau: number,
): QuantileFit {
  // Bracket from data pairwise extremes + OLS-ish range.
  let lo = -1;
  let hi = 1;
  const slopes = pairwiseSlopes(x, y, rows);
  if (slopes.length > 1) {
    let minS = slopes[0]!;
    let maxS = slopes[0]!;
    for (const s of slopes) {
      if (s < minS) minS = s;
      if (s > maxS) maxS = s;
    }
    const pad = Math.max(1, (maxS - minS) * 0.5, Math.abs(minS), Math.abs(maxS));
    lo = minS - pad;
    hi = maxS + pad;
  }
  // Expand until subgradient signs differ (or cap).
  for (let expand = 0; expand < 20; expand++) {
    const sLo = slopeSubgradientSign(x, y, rows, lo, tau);
    const sHi = slopeSubgradientSign(x, y, rows, hi, tau);
    if (sLo === 0) return residualToFit(x, y, rows, lo, tau);
    if (sHi === 0) return residualToFit(x, y, rows, hi, tau);
    if (sLo !== sHi) break;
    const width = hi - lo;
    lo -= width;
    hi += width;
  }
  for (let iter = 0; iter < 80; iter++) {
    const mid = 0.5 * (lo + hi);
    const s = slopeSubgradientSign(x, y, rows, mid, tau);
    if (s === 0) return residualToFit(x, y, rows, mid, tau);
    const sLo = slopeSubgradientSign(x, y, rows, lo, tau);
    if (sLo === s) lo = mid;
    else hi = mid;
  }
  const slope = 0.5 * (lo + hi);
  return residualToFit(x, y, rows, slope, tau);
}

function residualToFit(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
  slope: number,
  tau: number,
): QuantileFit {
  const { intercept } = residualPinball(x, y, rows, slope, tau);
  return { intercept, slope };
}

/**
 * Fit y = a + b x at quantile τ. Returns null if n < 2 or all x identical.
 */
export function fitLinearQuantileRegression(
  x: Float64Array,
  y: Float64Array,
  tau: number,
  rowIndices?: readonly number[],
): QuantileFit | null {
  const rows =
    rowIndices ??
    Array.from({ length: x.length }, (_, i) => i).filter(
      (i) => Number.isFinite(x[i]!) && Number.isFinite(y[i]!),
    );
  if (rows.length < 2) return null;
  let minX = x[rows[0]!]!;
  let maxX = minX;
  for (const row of rows) {
    const xv = x[row]!;
    if (xv < minX) minX = xv;
    if (xv > maxX) maxX = xv;
  }
  if (minX === maxX) return null;
  if (rows.length <= PAIRWISE_CAP) return fitByPairwise(x, y, rows, tau);
  return fitByBisection(x, y, rows, tau);
}

export function normalizeQuantiles(raw: readonly number[] | undefined): number[] {
  const source = raw === undefined || raw.length === 0 ? [...DEFAULT_QUANTILES] : [...raw];
  const cleaned = source
    .filter((q) => Number.isFinite(q) && q > 0 && q < 1)
    .toSorted((a, b) => a - b);
  // Unique within epsilon
  const uniq: number[] = [];
  for (const q of cleaned) {
    if (uniq.length === 0 || Math.abs(uniq.at(-1)! - q) > 1e-12) uniq.push(q);
  }
  return uniq;
}

export function statQuantile(input: StatQuantileInput): StatQuantileResult {
  const quantiles = normalizeQuantiles(input.quantiles);
  const evalN = Math.max(2, Math.floor(input.n ?? DEFAULT_N));
  const { x, y, groups, carried } = input;

  const byGroup = new Map<number, number[]>();
  let dropped = 0;
  for (let row = 0; row < x.length; row++) {
    if (!Number.isFinite(x[row]!) || !Number.isFinite(y[row]!)) {
      dropped++;
      continue;
    }
    const g = groups[row] ?? 0;
    let list = byGroup.get(g);
    if (list === undefined) {
      list = [];
      byGroup.set(g, list);
    }
    list.push(row);
  }

  const outX: number[] = [];
  const outY: number[] = [];
  const outG: number[] = [];
  const outQ: number[] = [];
  const carriedOut: Record<string, CellValue[]> = {};
  for (const key of Object.keys(carried)) carriedOut[key] = [];

  let seriesId = 0;
  let droppedGroups = 0;

  if (quantiles.length === 0) {
    return {
      x: new Float64Array(0),
      y: new Float64Array(0),
      groups: [],
      quantile: new Float64Array(0),
      carried: carriedOut,
      dropped,
      droppedGroups: byGroup.size,
    };
  }

  for (const g of byGroup.keys()) {
    const rows = byGroup.get(g)!;
    let anyFit = false;
    for (const tau of quantiles) {
      const fit = fitLinearQuantileRegression(x, y, tau, rows);
      if (fit === null) continue;
      anyFit = true;
      let minX = x[rows[0]!]!;
      let maxX = minX;
      for (const row of rows) {
        const xv = x[row]!;
        if (xv < minX) minX = xv;
        if (xv > maxX) maxX = xv;
      }
      const rep = rows[0]!;
      for (let k = 0; k < evalN; k++) {
        const t = evalN === 1 ? 0 : k / (evalN - 1);
        const x0 = minX + t * (maxX - minX);
        outX.push(x0);
        outY.push(fit.intercept + fit.slope * x0);
        outG.push(seriesId);
        outQ.push(tau);
        for (const key of Object.keys(carriedOut)) {
          carriedOut[key]!.push(carried[key]![rep]!);
        }
      }
      seriesId++;
    }
    if (!anyFit) droppedGroups++;
  }

  return {
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    groups: outG,
    quantile: Float64Array.from(outQ),
    carried: carriedOut,
    dropped,
    droppedGroups,
  };
}
