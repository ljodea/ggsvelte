/**
 * LOESS linear-system kernel — Gaussian elimination with partial pivoting
 * for the small (d+1)×(d+1) weighted least-squares normal equations solved
 * at every local window of a loess fit. Moved verbatim from `loess.ts`;
 * the singularity threshold scales from m[0] and the arithmetic must stay
 * bit-identical (R parity fixtures pin the bits).
 */

/**
 * Solve the (d+1)×(d+1) system M a = rhs by Gaussian elimination with
 * partial pivoting. Returns null when (numerically) singular. `rhs` is
 * length `size` (copied into the augmented column).
 */
export function solveSystem(m: Float64Array, size: number, rhs: Float64Array): Float64Array | null {
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
export function solveFirstColumn(m: Float64Array, size: number): Float64Array | null {
  const rhs = new Float64Array(size);
  rhs[0] = 1;
  return solveSystem(m, size, rhs);
}
