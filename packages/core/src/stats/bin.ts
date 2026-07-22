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
 *
 * Break-grid rules live in `bin-breaks.ts`.
 */
import type { CellValue } from "../table.js";

import { binBreaksBins, binBreaksWidth, binIndexOf } from "./bin-breaks.js";

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
