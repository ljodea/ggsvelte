/**
 * Bin membership for style/group binned scales (size, alpha, shape, …).
 *
 * Contract matches the historical
 * `boundaries.findIndex((upper, i) => i > 0 && value < upper) - 1`
 * with a last-bin fallback when value equals the final boundary:
 * bins are [b0, b1), [b1, b2), … and the last bin is closed on its upper edge.
 *
 * Binary search: O(log B) vs linear findIndex O(B) per mapped row (B ≤ 64).
 */

/**
 * Return the bin index for a finite value already known to lie in
 * [boundaries[0], boundaries.at(-1)] (callers handle OOB / NA).
 */
export function styleBinIndex(boundaries: readonly number[], value: number): number {
  const lastBin = boundaries.length - 2;
  if (lastBin < 0) return 0;
  // First index i ∈ [1, length) with boundaries[i] > value (strict upper bound).
  let lo = 1;
  let hi = boundaries.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (value < boundaries[mid]!) hi = mid;
    else lo = mid + 1;
  }
  const bin = lo - 1;
  if (bin < 0) return 0;
  return bin > lastBin ? lastBin : bin;
}
