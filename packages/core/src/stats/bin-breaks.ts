/**
 * ggplot2-compatible histogram break grids (ports of bin_breaks_bins /
 * bin_breaks_width / bins / bin_cut, verified against ggplot2 4.0.3):
 *  - default bins = 30, width = range/(bins-1), first bin CENTERED on
 *    the data minimum (boundary = min - width/2);
 *  - binwidth overrides bins; boundary aligns a bin edge, center aligns
 *    a bin center (mutually exclusive — `bin-center-and-boundary`);
 *  - breaks are fuzzed by 1e-8 × the median break gap before cutting;
 *  - `closed: "right"` (default): bins are (lo, hi], the first bin also
 *    includes its lower edge; `closed: "left"`: [lo, hi), the last bin
 *    also includes its upper edge;
 *  - zero-variance x falls back to width 0.1 (ggplot2's rule).
 */

export interface Breaks {
  breaks: number[];
  fuzzy: number[];
  rightClosed: boolean;
}

/** ggplot2's bin_breaks_width: a width-aligned break grid over the range. */
export function binBreaksWidth(
  range: [number, number],
  width: number,
  boundary: number | undefined,
  center: number | undefined,
  closed: "right" | "left",
): Breaks {
  const edge = boundary ?? (center === undefined ? width / 2 : center - width / 2);
  const shift = Math.floor((range[0] - edge) / width);
  const origin = edge + shift * width;
  const maxX = range[1] + (1 - 1e-8) * width;
  // R's seq(): from + (0:n) * by (multiplication, not accumulation — no
  // floating-point drift across many bins).
  const steps = Math.floor((maxX - origin) / width + 1e-10);
  const breaks: number[] = [];
  for (let k = 0; k <= steps; k++) breaks.push(origin + k * width);
  if (breaks.length === 1) breaks.push(breaks[0]! + width);
  // Fuzz (ggplot2's bins()): median gap × 1e-8; right-closed fuzzes the
  // first break down and the rest up; left-closed the mirror image.
  const gaps = breaks.slice(1).map((b, i) => b - breaks[i]!);
  gaps.sort((a, b) => a - b);
  const mid =
    gaps.length % 2 === 1
      ? gaps[(gaps.length - 1) / 2]!
      : (gaps[gaps.length / 2 - 1]! + gaps[gaps.length / 2]!) / 2;
  const fuzz = Number.isFinite(mid) ? 1e-8 * mid : Number.EPSILON * 1000;
  const rightClosed = closed === "right";
  const fuzzy = breaks.map((b, i) =>
    rightClosed ? (i === 0 ? b - fuzz : b + fuzz) : i === breaks.length - 1 ? b + fuzz : b - fuzz,
  );
  return { breaks, fuzzy, rightClosed };
}

/** ggplot2's bin_breaks_bins: derive the width from a bin count. */
export function binBreaksBins(
  range: [number, number],
  bins: number,
  boundary: number | undefined,
  center: number | undefined,
  closed: "right" | "left",
): Breaks {
  const span = range[1] - range[0];
  let width: number;
  let edge = boundary;
  let mid = center;
  if (span === 0) {
    width = 0.1;
  } else if (bins === 1) {
    width = span;
    edge = range[0];
    mid = undefined;
  } else {
    width = span / (bins - 1);
    if (mid === undefined) {
      edge = edge ?? range[0] - width / 2;
    }
    // ggplot2's edge-alignment quirk: a boundary aligned with the range
    // edges switches to width = span / bins so exactly `bins` bins result.
    if (
      edge !== undefined &&
      (mod(range[0], width) === mod(edge, width) || mod(range[1], width) === mod(edge, width))
    ) {
      width = span / bins;
    }
  }
  return binBreaksWidth(range, width, edge, mid, closed);
}

/** R's `%%` (result carries the sign of the divisor). */
function mod(a: number, b: number): number {
  const r = a % b;
  return r !== 0 && Math.sign(r) !== Math.sign(b) ? r + b : r;
}

/** Bin index of a value over fuzzy breaks (ggplot2's bin_cut), or -1. */
export function binIndexOf(v: number, fuzzy: readonly number[], rightClosed: boolean): number {
  const last = fuzzy.length - 1;
  if (rightClosed) {
    // (lo, hi], include.lowest: the first bin also takes v == fuzzy[0].
    if (v < fuzzy[0]! || v > fuzzy[last]!) return -1;
    if (v === fuzzy[0]!) return 0;
    let lo = 0;
    let hi = last;
    // Find the smallest i with fuzzy[i] >= v; bin index is i - 1.
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (fuzzy[mid]! >= v) hi = mid;
      else lo = mid + 1;
    }
    return lo - 1 < 0 ? 0 : lo - 1;
  }
  // [lo, hi), include highest: the last bin also takes v == fuzzy[last].
  if (v < fuzzy[0]! || v > fuzzy[last]!) return -1;
  if (v === fuzzy[last]!) return last - 1;
  let lo = 0;
  let hi = last;
  // Find the largest i with fuzzy[i] <= v; bin index is i.
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (fuzzy[mid]! <= v) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(lo, last - 1);
}
