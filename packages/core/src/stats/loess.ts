/**
 * LOESS — local polynomial regression, written for parity with R's
 * stats::loess(family = "gaussian", surface = "direct", statistics =
 * "exact") — the reference the R fixtures pin (see decision 0010 for the
 * measured tolerances, including the gap to R's DEFAULT
 * surface = "interpolate" / statistics = "approximate" path that ggplot2's
 * geom_smooth uses).
 *
 * Adapted in structure (nearest-neighbor window walk, tricube kernel) from
 * SveltePlot's ISC-licensed `regression/loess.ts`, itself derived from
 * d3-regression (Harry Stevens), science.js (Jason Davies), and
 * vega-statistics (Jeffrey Heer) — see the repo NOTICE file. Substantially
 * rewritten for R parity: span-based neighborhoods (q = floor(span·n)),
 * configurable degree (2 = R default; the reference is degree-1 only),
 * evaluation at arbitrary points (predict), and exact operator statistics
 * (trace(L), δ1, δ2, σ) for the confidence band. The reference's robustness
 * iterations are intentionally absent: R's gaussian family fits by weighted
 * least squares with NO robustness iterations.
 *
 * Statistics: ŷ(x0) = l(x0)ᵀ y with Var(ŷ(x0)) = σ²·‖l(x0)‖². σ² = RSS/δ1,
 * δ1 = n − 2·tr(L) + tr(LᵀL) (exact, O(n·q)); δ2 = tr(((I−L)ᵀ(I−L))²) is
 * computed EXACTLY for n ≤ DELTA2_EXACT_LIMIT (dense O(n²·q + n³) algebra —
 * fixture-sized inputs) and approximated by δ1 above it (t quantiles are
 * insensitive to df at those sizes; decision 0010 quantifies).
 */

/** Exact-δ2 size limit (above it, df falls back to δ1). */
const DELTA2_EXACT_LIMIT = 300;

export interface LoessOptions {
  /** Neighborhood fraction (0, 1]; q = floor(span · n). R default 0.75. */
  span: number;
  /** Local polynomial degree (1 or 2; R default 2). */
  degree: 1 | 2;
  /** Compute δ1/δ2/σ for confidence bands. */
  statistics: boolean;
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
  /** δ2 (two.delta; = δ1 when n > DELTA2_EXACT_LIMIT). */
  delta2: number;
  /** Look-up degrees of freedom for t quantiles: δ1² / δ2. */
  df: number;
}

function tricube(u: number): number {
  const t = 1 - u * u * u;
  return t * t * t;
}

/** δ2 = tr(((I−L)ᵀ(I−L))²) = ‖(I−L)ᵀ(I−L)‖²_F over a dense L (n ≤ limit). */
function exactDelta2(dense: Float64Array, n: number): number {
  const b = new Float64Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let v = 0;
      for (let k = 0; k < n; k++) {
        const ikr = (k === r ? 1 : 0) - dense[k * n + r]!;
        const ikc = (k === c ? 1 : 0) - dense[k * n + c]!;
        v += ikr * ikc;
      }
      b[r * n + c] = v;
    }
  }
  let delta2 = 0;
  for (let i = 0; i < n * n; i++) delta2 += b[i]! * b[i]!;
  return delta2;
}

/**
 * Solve the (d+1)×(d+1) system M a = e1 by Gaussian elimination with
 * partial pivoting. Returns null when (numerically) singular.
 */
function solveFirstColumn(m: Float64Array, size: number): Float64Array | null {
  // Augment with e1.
  const a = new Float64Array(size * (size + 1));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) a[r * (size + 1) + c] = m[r * size + c]!;
    a[r * (size + 1) + size] = r === 0 ? 1 : 0;
  }
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) {
      if (Math.abs(a[r * (size + 1) + col]!) > Math.abs(a[pivot * (size + 1) + col]!)) pivot = r;
    }
    const pv = a[pivot * (size + 1) + col]!;
    if (!(Math.abs(pv) > 1e-12 * Math.max(1, Math.abs(m[0]!)))) return null;
    if (pivot !== col) {
      for (let c = col; c <= size; c++) {
        const t = a[col * (size + 1) + c]!;
        a[col * (size + 1) + c] = a[pivot * (size + 1) + c]!;
        a[pivot * (size + 1) + c] = t;
      }
    }
    for (let r = col + 1; r < size; r++) {
      const f = a[r * (size + 1) + col]! / a[col * (size + 1) + col]!;
      if (f === 0) continue;
      for (let c = col; c <= size; c++) {
        a[r * (size + 1) + c] = a[r * (size + 1) + c]! - f * a[col * (size + 1) + c]!;
      }
    }
  }
  const out = new Float64Array(size);
  for (let r = size - 1; r >= 0; r--) {
    let v = a[r * (size + 1) + size]!;
    for (let c = r + 1; c < size; c++) v -= a[r * (size + 1) + c]! * out[c]!;
    out[r] = v / a[r * (size + 1) + r]!;
  }
  return out;
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

  /**
   * Local weighted fit at x0: returns the l(x0) weight vector over the
   * window [i0, i0 + q) such that fit = Σ l_j · ys[i0 + j].
   */
  const localWeights = (x0: number): { i0: number; l: Float64Array } | null => {
    // Nearest-q window: binary search, then two-pointer expansion.
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
    const i0 = left + 1;
    const i1 = i0 + q - 1;
    const dmax = Math.max(x0 - xs[i0]!, xs[i1]! - x0);

    // Kernel weights (equal when the whole window sits at one x).
    const w = new Float64Array(q);
    if (dmax <= 0) {
      w.fill(1);
    } else {
      for (let j = 0; j < q; j++) {
        const u = Math.abs(xs[i0 + j]! - x0) / dmax;
        w[j] = u < 1 ? tricube(u) : 0;
      }
    }

    // Weighted least squares on the centered basis (1, z, z²), z = x − x0,
    // reducing the degree on singular systems (duplicate-x windows).
    for (let d = degree; d >= 0; d--) {
      const size = d + 1;
      const m = new Float64Array(size * size);
      for (let j = 0; j < q; j++) {
        const z = xs[i0 + j]! - x0;
        const wj = w[j]!;
        if (wj === 0) continue;
        let zp = 1;
        const powers = new Float64Array(2 * d + 1);
        for (let p = 0; p <= 2 * d; p++) {
          powers[p] = zp;
          zp *= z;
        }
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            m[r * size + c] = m[r * size + c]! + wj * powers[r + c]!;
          }
        }
      }
      const a = solveFirstColumn(m, size);
      if (a === null) continue;
      const l = new Float64Array(q);
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

  const predictAt = (x0: number): { fit: number; norm: number } | null => {
    const lw = localWeights(x0);
    if (lw === null) return null;
    let fit = 0;
    let norm2 = 0;
    for (let j = 0; j < q; j++) {
      const lj = lw.l[j]!;
      fit += lj * ys[lw.i0 + j]!;
      norm2 += lj * lj;
    }
    return { fit, norm: Math.sqrt(norm2) };
  };

  let sigma = NaN;
  let delta1 = NaN;
  let delta2 = NaN;
  let df = NaN;
  if (options.statistics) {
    // Fit at every data point: residuals, tr(L), tr(LᵀL) — and the dense L
    // for exact δ2 on fixture-sized inputs.
    const dense = n <= DELTA2_EXACT_LIMIT ? new Float64Array(n * n) : null;
    let trL = 0;
    let trLtL = 0;
    let rss = 0;
    let ok = true;
    for (let i = 0; i < n; i++) {
      const lw = localWeights(xs[i]!);
      if (lw === null) {
        ok = false;
        break;
      }
      let fit = 0;
      for (let j = 0; j < q; j++) {
        const lj = lw.l[j]!;
        fit += lj * ys[lw.i0 + j]!;
        trLtL += lj * lj;
        if (lw.i0 + j === i) trL += lj;
        if (dense !== null) dense[i * n + lw.i0 + j] = lj;
      }
      const e = ys[i]! - fit;
      rss += e * e;
    }
    if (!ok) return null;
    delta1 = n - 2 * trL + trLtL;
    sigma = Math.sqrt(rss / delta1);
    // Documented approximation beyond the exact limit: δ2 = δ1.
    delta2 = dense === null ? delta1 : exactDelta2(dense, n);
    df = (delta1 * delta1) / delta2;
  }

  return {
    predict: (x0: number) => predictAt(x0)?.fit ?? NaN,
    seNorm: (x0: number) => predictAt(x0)?.norm ?? NaN,
    sigma,
    delta1,
    delta2,
    df,
  };
}
