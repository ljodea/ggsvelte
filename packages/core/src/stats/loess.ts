/**
 * LOESS — local polynomial regression.
 *
 * Two surfaces (chosen automatically by n unless overridden):
 *
 *  - **direct + exact** (n ≤ INTERPOLATE_DIRECT_LIMIT, or surface:"direct"):
 *    R's `surface="direct", statistics="exact"` — the reference the R fixtures
 *    pin (decision 0010). Fit at every evaluation / data point with window
 *    q ≈ span·n. Exact δ1 / δ2 / σ when statistics are requested (δ2 exact
 *    only for n ≤ DELTA2_EXACT_LIMIT; above that δ2 falls back to δ1).
 *
 *  - **interpolate + approximate** (n > INTERPOLATE_DIRECT_LIMIT by default):
 *    R's default `surface="interpolate", statistics="approximate"` spirit
 *    that ggplot2's geom_smooth uses. Build a 1D kd-tree-style partition of
 *    the x-range (leaf capacity floor(n·span·cell)), fit only at cell
 *    vertices, cubic-Hermite blend value + derivative for ŷ(x0), and
 *    approximate the SE band from residual RSS + vertex ‖l‖ interpolation.
 *    Cost O(nv·q + n) with nv ≪ n, not O(n·q).
 *
 * Adapted in structure (nearest-neighbor window walk, tricube kernel) from
 * SveltePlot's ISC-licensed `regression/loess.ts`, itself derived from
 * d3-regression (Harry Stevens), science.js (Jason Davies), and
 * vega-statistics (Jeffrey Heer) — see the repo NOTICE file. Substantially
 * rewritten for R parity: span-based neighborhoods (q = floor(span·n)),
 * configurable degree (2 = R default; the reference is degree-1 only),
 * evaluation at arbitrary points (predict), and exact operator statistics
 * (trace(L), δ1, δ2, σ) for the confidence band on the direct path. The
 * reference's robustness iterations are intentionally absent: R's gaussian
 * family fits by weighted least squares with NO robustness iterations.
 *
 * Statistics (direct/exact): ŷ(x0) = l(x0)ᵀ y with Var(ŷ(x0)) = σ²·‖l(x0)‖².
 * σ² = RSS/δ1, δ1 = n − 2·tr(L) + tr(LᵀL) (exact, O(n·q)); δ2 =
 * tr(((I−L)ᵀ(I−L))²) is computed EXACTLY for n ≤ DELTA2_EXACT_LIMIT (dense
 * O(n²·q + n³) algebra — fixture-sized inputs) and approximated by δ1 above
 * it (t quantiles are insensitive to df at those sizes; decision 0010).
 */

/** Exact-δ2 size limit (above it, df falls back to δ1). */
const DELTA2_EXACT_LIMIT = 300;

/**
 * Size at which the default surface switches from direct/exact to
 * interpolate/approximate. Below this, existing R fixtures stay on the
 * analytic path (bit-identical). Above it, large-n SE is O(nv·q) instead of
 * O(n·q). Mirrors the density dual-path pattern (size-gated exact path).
 */
const INTERPOLATE_DIRECT_LIMIT = 500;

/** R loess.control(cell) default — leaf capacity is floor(n·span·cell). */
const DEFAULT_CELL = 0.2;

/** R ehg126 bounding-box pad: 0.5% of the data range. */
const BOX_PAD = 0.005;

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
 * Solve the (d+1)×(d+1) system M a = rhs by Gaussian elimination with
 * partial pivoting. Returns null when (numerically) singular. `rhs` is
 * length `size` (copied into the augmented column).
 */
function solveSystem(m: Float64Array, size: number, rhs: Float64Array): Float64Array | null {
  const a = new Float64Array(size * (size + 1));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) a[r * (size + 1) + c] = m[r * size + c]!;
    a[r * (size + 1) + size] = rhs[r]!;
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

/** Solve M a = e1 (first column of M⁻¹). */
function solveFirstColumn(m: Float64Array, size: number): Float64Array | null {
  const rhs = new Float64Array(size);
  rhs[0] = 1;
  return solveSystem(m, size, rhs);
}

/**
 * 1D kd-tree-style vertices: start with the padded data range, recursively
 * median-split leaves whose point count exceeds floor(n·span·cell). R's
 * multi-D kd-tree reduces to this for univariate loess (geom_smooth).
 */
function buildVertices1D(xs: Float64Array, n: number, span: number, cell: number): Float64Array {
  const xmin = xs[0]!;
  const xmax = xs[n - 1]!;
  const range = Math.max(xmax - xmin, Number.EPSILON);
  const pad = BOX_PAD * range;
  const vLo0 = xmin - pad;
  const vHi0 = xmax + pad;
  const fc = Math.max(1, Math.floor(n * span * cell + 1e-9));
  const verts: number[] = [vLo0, vHi0];

  const split = (vLo: number, vHi: number, p0: number, p1: number): void => {
    const count = p1 - p0;
    if (count <= fc) return;
    if (!(vHi > vLo)) return;
    // Median of points in this leaf; ties go to the high child (R convention).
    const mid = p0 + (count >> 1);
    const cut = xs[mid]!;
    if (!(cut > vLo && cut < vHi)) {
      // Degenerate: all points share an x, or cut lands on a bound.
      if (xs[p0] === xs[p1 - 1]) return;
      // Walk to a cut strictly inside the cell.
      let i = mid;
      while (i < p1 && !(xs[i]! > vLo && xs[i]! < vHi)) i++;
      if (i >= p1) {
        i = mid - 1;
        while (i >= p0 && !(xs[i]! > vLo && xs[i]! < vHi)) i--;
        if (i < p0) return;
      }
      const cut2 = xs[i]!;
      if (!(cut2 > vLo && cut2 < vHi)) return;
      verts.push(cut2);
      // Sorted xs → left = [p0, first index with xs >= cut2).
      let lo = p0;
      let hi = p1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (xs[m]! < cut2) lo = m + 1;
        else hi = m;
      }
      split(vLo, cut2, p0, lo);
      split(cut2, vHi, lo, p1);
      return;
    }
    verts.push(cut);
    // Points with x < cut go left; x >= cut go right (sorted → mid split).
    split(vLo, cut, p0, mid);
    split(cut, vHi, mid, p1);
  };

  split(vLo0, vHi0, 0, n);
  verts.sort((a, b) => a - b);
  // Unique (within a tight epsilon of the data scale).
  const eps = 1e-12 * Math.max(1, range);
  const uniq: number[] = [verts[0]!];
  for (let i = 1; i < verts.length; i++) {
    if (verts[i]! - uniq.at(-1)! > eps) uniq.push(verts[i]!);
  }
  return Float64Array.from(uniq);
}

/** Cubic Hermite blend of endpoint values + derivatives (R ehg128, 1D). */
function hermite(
  h: number,
  g0: number,
  g1: number,
  gp0: number,
  gp1: number,
  width: number,
): number {
  const h2 = h * h;
  const omh = 1 - h;
  const phi0 = omh * omh * (1 + 2 * h);
  const phi1 = h2 * (3 - 2 * h);
  const psi0 = h * omh * omh;
  const psi1 = h2 * (h - 1);
  return phi0 * g0 + phi1 * g1 + (psi0 * gp0 + psi1 * gp1) * width;
}

/** Binary-search the cell [verts[i], verts[i+1]] containing x0 (clamped). */
function cellIndex(verts: Float64Array, x0: number): number {
  const nv = verts.length;
  if (x0 <= verts[0]!) return 0;
  if (x0 >= verts[nv - 1]!) return nv - 2;
  let lo = 0;
  let hi = nv - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (verts[mid]! <= x0) lo = mid;
    else hi = mid;
  }
  return lo;
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

  // ── Interpolate surface (large n) ──────────────────────────────────────
  if (surface === "interpolate") {
    const cell = options.cell ?? DEFAULT_CELL;
    const verts = buildVertices1D(xs, n, span, cell);
    const nv = verts.length;
    const vFit = new Float64Array(nv);
    const vDeriv = new Float64Array(nv);
    const vSe = new Float64Array(nv);
    let ok = true;
    // Vertices are sorted ascending — warm-slide the nearest-q window.
    let i0w = windowFor(verts[0]!);
    for (let v = 0; v < nv; v++) {
      const x0 = verts[v]!;
      while (i0w + q < n && xs[i0w + q]! - x0 < x0 - xs[i0w]!) i0w++;
      const windowFirst = xs[i0w]!;
      const windowLast = xs[i0w + q - 1]!;
      if (windowFirst === windowLast) i0w = windowFor(x0);
      const lf = localFitAt(x0, i0w);
      if (lf === null) {
        ok = false;
        break;
      }
      vFit[v] = lf.fit;
      vDeriv[v] = lf.deriv;
      vSe[v] = lf.seNorm;
    }
    if (!ok) return null;

    const predictInterp = (x0: number): number => {
      if (nv === 1) return vFit[0]!;
      const i = cellIndex(verts, x0);
      const va = verts[i]!;
      const vb = verts[i + 1]!;
      const width = vb - va;
      if (!(width > 0)) return vFit[i]!;
      // Clamp to the vertex hull (ggplot eval grid sits inside data range).
      const t = Math.min(1, Math.max(0, (x0 - va) / width));
      return hermite(t, vFit[i]!, vFit[i + 1]!, vDeriv[i]!, vDeriv[i + 1]!, width);
    };

    const seNormInterp = (x0: number): number => {
      if (nv === 1) return vSe[0]!;
      const i = cellIndex(verts, x0);
      const va = verts[i]!;
      const vb = verts[i + 1]!;
      const width = vb - va;
      if (!(width > 0)) return vSe[i]!;
      const t = Math.min(1, Math.max(0, (x0 - va) / width));
      // Linear blend of ‖l‖ (no derivative of the influence row).
      return (1 - t) * vSe[i]! + t * vSe[i + 1]!;
    };

    let sigma = NaN;
    let delta1 = NaN;
    let delta2 = NaN;
    let df = NaN;
    if (options.statistics) {
      // Residuals from the interpolated surface at the data; approximate
      // equivalent parameters (R statistics="approximate" spirit — not the
      // full ehg141 calibration table). τ = degree+1; inflate when span < 1.
      let rss = 0;
      for (let i = 0; i < n; i++) {
        const e = ys[i]! - predictInterp(xs[i]!);
        rss += e * e;
      }
      const tau = degree + 1;
      const trL = tau * (1 + Math.max(0, (1 - span) / span));
      // Near-projection: tr(LᵀL) ≈ tr(L) for a smoother.
      const trLtL = trL;
      delta1 = n - 2 * trL + trLtL;
      if (!(delta1 > 0)) delta1 = Math.max(1, n - trL);
      sigma = Math.sqrt(rss / delta1);
      delta2 = delta1;
      df = (delta1 * delta1) / delta2;
    }

    return {
      predict: predictInterp,
      seNorm: seNormInterp,
      sigma,
      delta1,
      delta2,
      df,
    };
  }

  // ── Direct surface (small n / exact) ───────────────────────────────────
  const localWeights = (x0: number): { i0: number; l: Float64Array } | null =>
    localWeightsAt(x0, windowFor(x0));

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
    // Warm-start window walk: evaluation points xs[i] are sorted ascending,
    // so the nearest-q window only slides right — amortized O(n) total
    // instead of O(n·q). The slide never moves on an exact tie (matches the
    // cold two-pointer's left preference), and boundary tie-swaps exchange
    // zero-weight endpoints at dmax, leaving fits, tr(L), tr(LᵀL), and the
    // dense L bit-identical. The one window-dependent case is dmax = 0
    // (more than q points share one x): fall back to the cold selection.
    let i0w = windowFor(xs[0]!);
    for (let i = 0; i < n; i++) {
      const x0 = xs[i]!;
      while (i0w + q < n && xs[i0w + q]! - x0 < x0 - xs[i0w]!) i0w++;
      const windowFirst = xs[i0w]!;
      const windowLast = xs[i0w + q - 1]!;
      if (windowFirst === windowLast) i0w = windowFor(x0);
      const lw = localWeightsAt(x0, i0w);
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

/** Exported for tests / docs — size at which default surface flips. */
export const LOESS_INTERPOLATE_DIRECT_LIMIT = INTERPOLATE_DIRECT_LIMIT;
