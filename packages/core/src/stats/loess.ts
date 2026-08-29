/**
 * LOESS local polynomial regression with direct/exact and
 * interpolate/approximate surfaces (decision 0010). The direct surface uses
 * q ≈ span·n neighborhoods and exact operator statistics for fixture-sized
 * inputs. The large-n surface fits partition vertices and Hermite-interpolates
 * values, derivatives, and SE norms in O(nv·q + n).
 *
 * The nearest-neighbor walk and tricube-kernel structure began from
 * SveltePlot's ISC-licensed regression/loess.ts; see NOTICE. This version adds
 * R-compatible spans, degree-2 fits, arbitrary prediction, and direct-surface
 * δ1/δ2/σ statistics without robustness iterations.
 */

import { solveFirstColumn, solveSystem } from "./loess-linear-system.js";
import { buildVertices1D, cellIndex, DEFAULT_CELL, hermite } from "./loess-interpolate.js";
import { DELTA2_EXACT_LIMIT, exactDelta2 } from "./loess-statistics.js";

/**
 * Size at which the default surface switches from direct/exact to
 * interpolate/approximate. Below this, existing R fixtures stay on the
 * analytic path (bit-identical). Above it, large-n SE is O(nv·q) instead of
 * O(n·q). Mirrors the density dual-path pattern (size-gated exact path).
 */
const INTERPOLATE_DIRECT_LIMIT = 500;

export interface LoessOptions {
  /** Neighborhood fraction (0, 1]; q = floor(span · n). R default 0.75. */
  span: number;
  /** Local polynomial degree (1 or 2; R default 2). */
  degree: 1 | 2;
  /** Compute δ1/δ2/σ for confidence bands. */
  statistics: boolean;
  /**
   * Evaluation surface. Default: `"direct"` when n ≤ INTERPOLATE_DIRECT_LIMIT,
   * else `"interpolate"`. Direct matches R surface="direct"/statistics="exact";
   * interpolate matches R's default large-n path in spirit (1D Hermite blend
   * of vertex fits; approximate SE).
   */
  surface?: "direct" | "interpolate";
  /**
   * R cell parameter for the interpolate path (default 0.2). Leaf capacity
   * is floor(n · span · cell); smaller cell → more vertices → closer to direct.
   */
  cell?: number;
}

export interface LoessModel {
  /** Fitted value at an arbitrary x. */
  predict(x0: number): number;
  /** ‖l(x0)‖ — multiply by sigma for the standard error at x0. */
  seNorm(x0: number): number;
  /** Residual standard error sqrt(RSS / δ1) (NaN without statistics). */
  sigma: number;
  /** δ1 (one.delta). */
  delta1: number;
  /** δ2 (two.delta; = δ1 when n > DELTA2_EXACT_LIMIT or on interpolate). */
  delta2: number;
  /** Look-up degrees of freedom for t quantiles: δ1² / δ2. */
  df: number;
}

type LocalWeights = { i0: number; l: Float64Array };
type LocalFit = { fit: number; deriv: number; seNorm: number };

interface LoessContext {
  n: number;
  span: number;
  degree: 1 | 2;
  statistics: boolean;
  cell: number | undefined;
  xs: Float64Array;
  ys: Float64Array;
  q: number;
  windowFor: (x: number) => number;
  localWeightsAt: (x: number, start: number) => LocalWeights | null;
  localFitAt: (x: number, start: number) => LocalFit | null;
}

function interpolatedModel(context: LoessContext): LoessModel | null {
  const { n, span, degree, xs, ys, q, windowFor, localFitAt } = context;
  const verts = buildVertices1D(xs, n, span, context.cell ?? DEFAULT_CELL);
  const nv = verts.length;
  const vFit = new Float64Array(nv);
  const vDeriv = new Float64Array(nv);
  const vSe = new Float64Array(nv);
  let ok = true;
  let windowStart = windowFor(verts[0]!);
  for (let vertex = 0; vertex < nv; vertex++) {
    const x = verts[vertex]!;
    while (windowStart + q < n && xs[windowStart + q]! - x < x - xs[windowStart]!) windowStart++;
    if (xs[windowStart] === xs[windowStart + q - 1]) windowStart = windowFor(x);
    const fit = localFitAt(x, windowStart);
    if (fit === null) {
      ok = false;
      break;
    }
    vFit[vertex] = fit.fit;
    vDeriv[vertex] = fit.deriv;
    vSe[vertex] = fit.seNorm;
  }
  if (!ok) return null;

  const predict = (x: number): number => {
    if (nv === 1) return vFit[0]!;
    const i = cellIndex(verts, x);
    const start = verts[i]!;
    const width = verts[i + 1]! - start;
    if (!(width > 0)) return vFit[i]!;
    const t = Math.min(1, Math.max(0, (x - start) / width));
    return hermite(t, vFit[i]!, vFit[i + 1]!, vDeriv[i]!, vDeriv[i + 1]!, width);
  };
  const seNorm = (x: number): number => {
    if (nv === 1) return vSe[0]!;
    const i = cellIndex(verts, x);
    const start = verts[i]!;
    const width = verts[i + 1]! - start;
    if (!(width > 0)) return vSe[i]!;
    const t = Math.min(1, Math.max(0, (x - start) / width));
    return (1 - t) * vSe[i]! + t * vSe[i + 1]!;
  };

  let sigma = NaN;
  let delta1 = NaN;
  let delta2 = NaN;
  let df = NaN;
  if (context.statistics) {
    let rss = 0;
    for (let i = 0; i < n; i++) {
      const error = ys[i]! - predict(xs[i]!);
      rss += error * error;
    }
    const tau = degree + 1;
    const trL = tau * (1 + Math.max(0, (1 - span) / span));
    delta1 = n - trL;
    if (!(delta1 > 0)) delta1 = Math.max(1, n - trL);
    sigma = Math.sqrt(rss / delta1);
    delta2 = delta1;
    df = (delta1 * delta1) / delta2;
  }
  return { predict, seNorm, sigma, delta1, delta2, df };
}

function directModel(context: LoessContext): LoessModel | null {
  const { n, xs, ys, q, windowFor, localWeightsAt } = context;
  const localWeights = (x: number): LocalWeights | null => localWeightsAt(x, windowFor(x));
  const predictAt = (x: number): { fit: number; norm: number } | null => {
    const weights = localWeights(x);
    if (weights === null) return null;
    let fit = 0;
    let norm2 = 0;
    for (let j = 0; j < q; j++) {
      const weight = weights.l[j]!;
      fit += weight * ys[weights.i0 + j]!;
      norm2 += weight * weight;
    }
    return { fit, norm: Math.sqrt(norm2) };
  };

  let sigma = NaN;
  let delta1 = NaN;
  let delta2 = NaN;
  let df = NaN;
  if (context.statistics) {
    const dense = n <= DELTA2_EXACT_LIMIT ? new Float64Array(n * n) : null;
    let trL = 0;
    let trLtL = 0;
    let rss = 0;
    let ok = true;
    let windowStart = windowFor(xs[0]!);
    for (let i = 0; i < n; i++) {
      const x = xs[i]!;
      while (windowStart + q < n && xs[windowStart + q]! - x < x - xs[windowStart]!) windowStart++;
      if (xs[windowStart] === xs[windowStart + q - 1]) windowStart = windowFor(x);
      const weights = localWeightsAt(x, windowStart);
      if (weights === null) {
        ok = false;
        break;
      }
      let fit = 0;
      for (let j = 0; j < q; j++) {
        const weight = weights.l[j]!;
        fit += weight * ys[weights.i0 + j]!;
        trLtL += weight * weight;
        if (weights.i0 + j === i) trL += weight;
        if (dense !== null) dense[i * n + weights.i0 + j] = weight;
      }
      const error = ys[i]! - fit;
      rss += error * error;
    }
    if (!ok) return null;
    delta1 = n - 2 * trL + trLtL;
    sigma = Math.sqrt(rss / delta1);
    delta2 = dense === null ? delta1 : exactDelta2(dense, n);
    df = (delta1 * delta1) / delta2;
  }
  return {
    predict: (x) => predictAt(x)?.fit ?? NaN,
    seNorm: (x) => predictAt(x)?.norm ?? NaN,
    sigma,
    delta1,
    delta2,
    df,
  };
}

function tricube(u: number): number {
  const t = 1 - u * u * u;
  return t * t * t;
}

/**
 * Fit a LOESS model over (x, y). Inputs must be finite; x need not be
 * sorted (a sorted copy is made). Returns null when the fit is degenerate
 * (fewer than degree + 2 points, or every local system singular).
 */
export function loessFit(
  x: Float64Array,
  y: Float64Array,
  options: LoessOptions,
): LoessModel | null {
  const n = x.length;
  const { span, degree } = options;
  if (n < degree + 2) return null;

  // Sort by x (stable order for ties).
  const order = Array.from({ length: n }, (_, i) => i).toSorted((a, b) => x[a]! - x[b]! || a - b);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = x[order[i]!]!;
    ys[i] = y[order[i]!]!;
  }

  const q = Math.max(degree + 1, Math.min(n, Math.floor(span * n + 1e-9)));
  const surface = options.surface ?? (n <= INTERPOLATE_DIRECT_LIMIT ? "direct" : "interpolate");

  // Scratch buffers reused across every local evaluation (issue #1422).
  const wScratch = new Float64Array(q);
  const lScratch = new Float64Array(q);

  /** Cold nearest-q window: binary search, then two-pointer expansion. */
  const windowFor = (x0: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (xs[mid]! < x0) lo = mid + 1;
      else hi = mid;
    }
    let left = lo - 1;
    let right = lo;
    for (let count = 0; count < q; count++) {
      if (left < 0) {
        right++;
      } else if (right >= n || x0 - xs[left]! <= xs[right]! - x0) {
        left--;
      } else {
        right++;
      }
    }
    return left + 1;
  };

  /**
   * Local weighted fit at x0 over the window [i0, i0 + q): fills lScratch
   * with the l(x0) weight vector such that fit = Σ l_j · ys[i0 + j].
   * Returns null when singular at every attempted degree.
   */
  const localWeightsAt = (x0: number, i0: number): { i0: number; l: Float64Array } | null => {
    const i1 = i0 + q - 1;
    const dmax = Math.max(x0 - xs[i0]!, xs[i1]! - x0);

    // Kernel weights (equal when the whole window sits at one x).
    const w = wScratch;
    if (dmax <= 0) {
      w.fill(1);
    } else {
      for (let j = 0; j < q; j++) {
        const u = Math.abs(xs[i0 + j]! - x0) / dmax;
        w[j] = u < 1 ? tricube(u) : 0;
      }
    }

    // Weighted least squares on the centered basis (1, z, z²), z = x − x0,
    // reducing the degree on singular systems (duplicate-x windows). The
    // normal-equation moments s_k = Σ wj·z^k are accumulated once (scalar
    // locals, same j-order and the same iterative power chain as the
    // previous per-point powers array — bit-identical); the (d+1)×(d+1)
    // system for each attempted degree reads off them, so degree reduction
    // no longer rebuilds the matrix.
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    for (let j = 0; j < q; j++) {
      const wj = w[j]!;
      if (wj === 0) continue;
      const z = xs[i0 + j]! - x0;
      const z2 = z * z;
      const z3 = z2 * z;
      const z4 = z3 * z;
      s0 += wj;
      s1 += wj * z;
      s2 += wj * z2;
      s3 += wj * z3;
      s4 += wj * z4;
    }
    for (let d = degree; d >= 0; d--) {
      const size = d + 1;
      const m = new Float64Array(size * size);
      if (d === 2) {
        m[0] = s0;
        m[1] = s1;
        m[2] = s2;
        m[3] = s1;
        m[4] = s2;
        m[5] = s3;
        m[6] = s2;
        m[7] = s3;
        m[8] = s4;
      } else if (d === 1) {
        m[0] = s0;
        m[1] = s1;
        m[2] = s1;
        m[3] = s2;
      } else {
        m[0] = s0;
      }
      const a = solveFirstColumn(m, size);
      if (a === null) continue;
      const l = lScratch;
      l.fill(0);
      for (let j = 0; j < q; j++) {
        const z = xs[i0 + j]! - x0;
        const wj = w[j]!;
        if (wj === 0) continue;
        let basis = 0;
        let zp = 1;
        for (let p = 0; p < size; p++) {
          basis += a[p]! * zp;
          zp *= z;
        }
        l[j] = wj * basis;
      }
      return { i0, l };
    }
    return null;
  };

  /**
   * Local fit + derivative + seNorm at x0 (for the interpolate surface).
   * ŷ' is the local-polynomial slope β1 (R vval storage for Hermite blend).
   */
  const localFitAt = (
    x0: number,
    i0: number,
  ): { fit: number; deriv: number; seNorm: number } | null => {
    const i1 = i0 + q - 1;
    const dmax = Math.max(x0 - xs[i0]!, xs[i1]! - x0);
    const w = wScratch;
    if (dmax <= 0) {
      w.fill(1);
    } else {
      for (let j = 0; j < q; j++) {
        const u = Math.abs(xs[i0 + j]! - x0) / dmax;
        w[j] = u < 1 ? tricube(u) : 0;
      }
    }
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    let ty0 = 0;
    let ty1 = 0;
    let ty2 = 0;
    for (let j = 0; j < q; j++) {
      const wj = w[j]!;
      if (wj === 0) continue;
      const z = xs[i0 + j]! - x0;
      const yj = ys[i0 + j]!;
      const z2 = z * z;
      const z3 = z2 * z;
      const z4 = z3 * z;
      s0 += wj;
      s1 += wj * z;
      s2 += wj * z2;
      s3 += wj * z3;
      s4 += wj * z4;
      ty0 += wj * yj;
      ty1 += wj * yj * z;
      ty2 += wj * yj * z2;
    }
    for (let d = degree; d >= 0; d--) {
      const size = d + 1;
      const m = new Float64Array(size * size);
      if (d === 2) {
        m[0] = s0;
        m[1] = s1;
        m[2] = s2;
        m[3] = s1;
        m[4] = s2;
        m[5] = s3;
        m[6] = s2;
        m[7] = s3;
        m[8] = s4;
      } else if (d === 1) {
        m[0] = s0;
        m[1] = s1;
        m[2] = s1;
        m[3] = s2;
      } else {
        m[0] = s0;
      }
      const rhs = new Float64Array(size);
      rhs[0] = ty0;
      if (size > 1) rhs[1] = ty1;
      if (size > 2) rhs[2] = ty2;
      const beta = solveSystem(m, size, rhs);
      if (beta === null) continue;
      // Influence row for seNorm (same a = M⁻¹ e1 as direct path).
      const a = solveFirstColumn(m, size);
      if (a === null) continue;
      let norm2 = 0;
      for (let j = 0; j < q; j++) {
        const z = xs[i0 + j]! - x0;
        const wj = w[j]!;
        if (wj === 0) continue;
        let basis = 0;
        let zp = 1;
        for (let p = 0; p < size; p++) {
          basis += a[p]! * zp;
          zp *= z;
        }
        const lj = wj * basis;
        norm2 += lj * lj;
      }
      return {
        fit: beta[0]!,
        deriv: size > 1 ? beta[1]! : 0,
        seNorm: Math.sqrt(norm2),
      };
    }
    return null;
  };

  const context: LoessContext = {
    n,
    span,
    degree,
    statistics: options.statistics,
    cell: options.cell,
    xs,
    ys,
    q,
    windowFor,
    localWeightsAt,
    localFitAt,
  };
  return surface === "interpolate" ? interpolatedModel(context) : directModel(context);
}

/** Exported for tests / docs — size at which default surface flips. */
export const LOESS_INTERPOLATE_DIRECT_LIMIT = INTERPOLATE_DIRECT_LIMIT;
