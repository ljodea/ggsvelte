/**
 * Ellipsis truncation against a TextMeasurer width budget.
 *
 * Binary search on keep length: O(log L) measureWidth calls (and O(L log L)
 * string work) instead of linear scan from the end O(L) measures / O(L²) joins.
 *
 * Assumes measureWidth is non-decreasing in keep length (true for the canonical
 * MetricsTableMeasurer, which sums per-code-point advances and ignores kerning).
 * Under a non-monotonic native measurer the "maximal fitting prefix" is not a
 * contiguous interval; both binary and linear scans are best-effort then.
 */
import type { TextMeasurer } from "./measure.js";

/**
 * Shorten `label` so measureWidth(result) ≤ maxWidth, appending `ellipsis` when
 * shortened. Returns `ellipsis` alone when even one code point + ellipsis is too
 * wide. Preserves code-point granularity (astral characters count once).
 */
export function truncateToFit(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  ellipsis: string,
): string {
  if (measurer.measureWidth(label, fontSize) <= maxWidth) return label;
  // oxlint-disable-next-line typescript/no-misused-spread -- code-point split is intentional
  const chars = [...label];
  if (chars.length <= 1) return ellipsis;

  // Largest keep in [1, chars.length - 1] such that prefix+ellipsis fits.
  let lo = 1;
  let hi = chars.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = chars.slice(0, mid).join("") + ellipsis;
    if (measurer.measureWidth(candidate, fontSize) <= maxWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best === 0 ? ellipsis : chars.slice(0, best).join("") + ellipsis;
}
