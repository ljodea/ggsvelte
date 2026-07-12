/**
 * The bin stat (ggplot2's stat_bin; R-fixture-tested against ggplot2 4.0.3).
 *
 * Stat output contract (plan: "Stat output contracts"):
 *  - required inputs: a CONTINUOUS x channel (numeric view). y must NOT be
 *    mapped to data (validate() enforces `computed-y-mapped`).
 *  - generated columns: `count` (rows per bin, or the sum of aes.weight),
 *    `density` (count / width / total, per group), `ncount` (count / max
 *    count, per group), `ndensity` (density / max density, per group).
 *    `x`/`xmin`/`xmax` become the positional outputs (bin centers/edges).
 *    `{ stat: "count" | "density" | "ncount" | "ndensity" }` channels
 *    resolve to these columns; y defaults to `{ stat: "count" }`.
 *  - grouping behavior: BREAKS are computed once from the whole layer's x
 *    range (ggplot2 derives them from the x scale's dimension, shared across
 *    groups — this is what makes stacked histograms line up); counting then
 *    runs per group. Every (group × bin) combination is emitted, INCLUDING
 *    zero-count bins (ggplot2 keeps them; stacking depends on it).
 *  - missing-value policy (ggplot2 na.rm semantics): rows with a missing or
 *    non-finite x are dropped and counted in `dropped` (the pipeline warns
 *    `removed-missing`); missing weights count as 0 (ggplot2's
 *    `weight[is.na(weight)] <- 0`).
 *  - binning rules (ports of ggplot2's bin_breaks_bins / bin_breaks_width /
 *    bins / bin_cut, verified against the installed 4.0.3 source):
 *      - default bins = 30, width = range/(bins-1), first bin CENTERED on
 *        the data minimum (boundary = min - width/2);
 *      - binwidth overrides bins; boundary aligns a bin edge, center aligns
 *        a bin center (mutually exclusive — `bin-center-and-boundary`);
 *      - breaks are fuzzed by 1e-8 × the median break gap before cutting;
 *      - `closed: "right"` (default): bins are (lo, hi], the first bin also
 *        includes its lower edge; `closed: "left"`: [lo, hi), the last bin
 *        also includes its upper edge;
 *      - zero-variance x falls back to width 0.1 (ggplot2's rule).
 */
import type { CellValue } from "../table.js";

interface BinParamsInput {
  bins?: number | undefined;
  binwidth?: number | undefined;
  boundary?: number | undefined;
  center?: number | undefined;
  closed?: "right" | "left" | undefined;
}

export interface BinStatInput {
  /** Numeric x view (post-binding; NaN = missing). */
  x: Float64Array;
  /** Group id per input row. */
  groups: readonly number[];
  /** Optional weights (aes.weight); counts become weight sums. */
  weights?: Float64Array | null;
  /** Discrete carried columns (constant per group), e.g. the fill field. */
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: BinParamsInput;
  /**
   * Break-grid range override. Facets with FIXED x scales pass the range of
   * the whole layer across panels here, so every panel bins over the same
   * break grid (ggplot2 derives breaks from the shared scale's dimension).
   * Free-x facets omit it (per-panel breaks).
   */
  range?: [number, number];
}

export interface BinStatResult {
  /** Bin center per output row. */
  x: Float64Array;
  xmin: Float64Array;
  xmax: Float64Array;
  count: Float64Array;
  density: Float64Array;
  ncount: Float64Array;
  ndensity: Float64Array;
  groups: number[];
  /** Carried columns re-sampled to output rows (per-group constants). */
  carried: Record<string, CellValue[]>;
  /** Input rows dropped (missing / non-finite x, or outside the breaks). */
  dropped: number;
  /** True when neither bins nor binwidth was given (default bins = 30). */
  usedDefaultBins: boolean;
}

interface Breaks {
  breaks: number[];
  fuzzy: number[];
  rightClosed: boolean;
}

/** ggplot2's bin_breaks_width: a width-aligned break grid over the range. */
function binBreaksWidth(
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
function binBreaksBins(
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
function binIndexOf(v: number, fuzzy: readonly number[], rightClosed: boolean): number {
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

export function statBin(input: BinStatInput): BinStatResult {
  const { x, groups, weights } = input;
  const params = input.params ?? {};
  const carriedNames = Object.keys(input.carried ?? {});
  const usedDefaultBins = params.bins === undefined && params.binwidth === undefined;

  // Layer-wide finite range (shared breaks across groups).
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const empty: BinStatResult = {
    x: new Float64Array(0),
    xmin: new Float64Array(0),
    xmax: new Float64Array(0),
    count: new Float64Array(0),
    density: new Float64Array(0),
    ncount: new Float64Array(0),
    ndensity: new Float64Array(0),
    groups: [],
    carried: Object.fromEntries(carriedNames.map((n) => [n, []])),
    dropped: x.length,
    usedDefaultBins,
  };
  if (min > max) return empty;

  const closed = params.closed ?? "right";
  const range: [number, number] = input.range ?? [min, max];
  const breaks =
    params.binwidth === undefined
      ? binBreaksBins(range, params.bins ?? 30, params.boundary, params.center, closed)
      : binBreaksWidth(range, params.binwidth, params.boundary, params.center, closed);
  const binCount = breaks.breaks.length - 1;

  // Present groups in first-seen order, with one carried sample row each.
  const groupOrder: number[] = [];
  const groupSlot = new Map<number, number>();
  const sampleRow: number[] = [];
  for (let i = 0; i < x.length; i++) {
    const g = groups[i]!;
    if (!groupSlot.has(g)) {
      groupSlot.set(g, groupOrder.length);
      groupOrder.push(g);
      sampleRow.push(i);
    }
  }

  // Count per (group, bin).
  const counts = new Float64Array(groupOrder.length * binCount);
  let dropped = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    if (!Number.isFinite(v)) {
      dropped++;
      continue;
    }
    const bin = binIndexOf(v, breaks.fuzzy, breaks.rightClosed);
    if (bin === -1) {
      dropped++;
      continue;
    }
    let w = 1;
    if (weights !== null && weights !== undefined) {
      // ggplot2: missing weights count as 0.
      w = Number.isFinite(weights[i]!) ? weights[i]! : 0;
    }
    const slot = groupSlot.get(groups[i]!)! * binCount + bin;
    counts[slot] = counts[slot]! + w;
  }

  // Emit all (group × bin) rows, zero-count bins included.
  const n = groupOrder.length * binCount;
  const outX = new Float64Array(n);
  const outXmin = new Float64Array(n);
  const outXmax = new Float64Array(n);
  const outCount = new Float64Array(n);
  const outDensity = new Float64Array(n);
  const outNcount = new Float64Array(n);
  const outNdensity = new Float64Array(n);
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  for (let s = 0; s < groupOrder.length; s++) {
    let total = 0;
    let maxCount = 0;
    for (let b = 0; b < binCount; b++) {
      const c = counts[s * binCount + b]!;
      total += Math.abs(c);
      if (Math.abs(c) > maxCount) maxCount = Math.abs(c);
    }
    let maxDensity = 0;
    for (let b = 0; b < binCount; b++) {
      const width = breaks.breaks[b + 1]! - breaks.breaks[b]!;
      const d = total > 0 ? counts[s * binCount + b]! / width / total : 0;
      if (d > maxDensity) maxDensity = d;
    }
    for (let b = 0; b < binCount; b++) {
      const row = s * binCount + b;
      const lo = breaks.breaks[b]!;
      const hi = breaks.breaks[b + 1]!;
      const width = hi - lo;
      const c = counts[row]!;
      outX[row] = (lo + hi) / 2;
      outXmin[row] = lo;
      outXmax[row] = hi;
      outCount[row] = c;
      outDensity[row] = total > 0 ? c / width / total : 0;
      outNcount[row] = maxCount > 0 ? c / maxCount : 0;
      outNdensity[row] = maxDensity > 0 ? (total > 0 ? c / width / total : 0) / maxDensity : 0;
      outGroups.push(groupOrder[s]!);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![sampleRow[s]!]!);
      }
    }
  }

  return {
    x: outX,
    xmin: outXmin,
    xmax: outXmax,
    count: outCount,
    density: outDensity,
    ncount: outNcount,
    ndensity: outNdensity,
    groups: outGroups,
    carried,
    dropped,
    usedDefaultBins,
  };
}
