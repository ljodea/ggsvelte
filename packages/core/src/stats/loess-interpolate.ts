/**
 * LOESS interpolate surface — 1D kd-tree-style vertex partition plus the
 * cubic-Hermite blending used by the large-n default path. Moved verbatim
 * from `loess.ts`; numeric expressions must stay bit-identical (R parity
 * fixtures pin the bits).
 */

/** R loess.control(cell) default — leaf capacity is floor(n·span·cell). */
export const DEFAULT_CELL = 0.2;

/** R ehg126 bounding-box pad: 0.5% of the data range. */
const BOX_PAD = 0.005;

/**
 * 1D kd-tree-style vertices: start with the padded data range, recursively
 * median-split leaves whose point count exceeds floor(n·span·cell). R's
 * multi-D kd-tree reduces to this for univariate loess (geom_smooth).
 */
export function buildVertices1D(
  xs: Float64Array,
  n: number,
  span: number,
  cell: number,
): Float64Array {
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
export function hermite(
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
export function cellIndex(verts: Float64Array, x0: number): number {
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
