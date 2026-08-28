/**
 * LOESS statistics — exact δ2 = tr(((I−L)ᵀ(I−L))²) over a dense influence
 * matrix L, plus the size gate that falls back to the δ1 approximation.
 * Moved verbatim from `loess.ts`; the algebra must stay bit-identical
 * (R parity fixtures pin the bits).
 */

/** Exact-δ2 size limit (above it, df falls back to δ1). */
export const DELTA2_EXACT_LIMIT = 300;

/** δ2 = tr(((I−L)ᵀ(I−L))²) = ‖(I−L)ᵀ(I−L)‖²_F over a dense L (n ≤ limit). */
export function exactDelta2(dense: Float64Array, n: number): number {
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
