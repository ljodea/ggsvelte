/**
 * The summary_bin stat (ggplot2's stat_summary_bin; #817 v1).
 *
 * Stat output contract:
 *  - required inputs: continuous numeric x and quantitative y.
 *  - bins continuous x with the same break rules as stat_bin (bin-breaks),
 *    then summarizes y within each (group × bin) via the shared summary
 *    fun registry (default mean ± se).
 *  - generated columns: `x` (bin center), `xmin`/`xmax` (bin edges — for
 *    bin-shaped interaction lineage), `y`/`ymin`/`ymax`.
 *  - empty bins are OMITTED (divergence from stat_bin which keeps zeros).
 *  - scale-space: x is already transformed when supplied; y is NOT re-transformed.
 *  - no weight channel (v1); no summary_2d / summary_hex.
 */
import type { CellValue } from "../table.js";

import { binBreaksBins, binBreaksWidth, binIndexOf } from "./bin-breaks.js";
import { summarizeValues, type SummaryFunName } from "./summary.js";

export interface SummaryBinParamsInput {
  bins?: number | undefined;
  binwidth?: number | undefined;
  boundary?: number | undefined;
  center?: number | undefined;
  closed?: "right" | "left" | undefined;
  fun?: SummaryFunName | undefined;
  funMin?: SummaryFunName | undefined;
  funMax?: SummaryFunName | undefined;
}

export interface SummaryBinStatInput {
  x: Float64Array;
  y: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: SummaryBinParamsInput;
  /** Facet fixed-x shared break range. */
  range?: [number, number];
}

export interface SummaryBinStatResult {
  x: Float64Array;
  xmin: Float64Array;
  xmax: Float64Array;
  y: Float64Array;
  ymin: Float64Array;
  ymax: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  usedDefaultBins: boolean;
  /**
   * The cut actually performed: the fuzzed grid handed to `binIndexOf` plus the
   * grid bin index per emitted row. Interaction lineage replays this instead of
   * re-deriving membership from the unfuzzed `xmin`/`xmax` edges (#905).
   */
  cut: { fuzzy: readonly number[]; rightClosed: boolean; binIndex: Int32Array };
}

type BinBreaks = ReturnType<typeof binBreaksBins>;
type SummaryBucket = { rows: number[]; sampleRow: number };

function finiteExtent(values: Float64Array): [number, number] | undefined {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    count++;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return count === 0 ? undefined : [min, max];
}

function collectBuckets(input: SummaryBinStatInput, breaks: BinBreaks) {
  const buckets = new Map<string, SummaryBucket>();
  const groupOrder: number[] = [];
  const seenGroup = new Set<number>();
  const binCount = breaks.breaks.length - 1;
  let dropped = 0;

  for (let i = 0; i < input.x.length; i++) {
    const x = input.x[i]!;
    const y = input.y[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      dropped++;
      continue;
    }
    const bin = binIndexOf(x, breaks.fuzzy, breaks.rightClosed);
    if (bin < 0 || bin >= binCount) {
      dropped++;
      continue;
    }
    const group = input.groups[i]!;
    if (!seenGroup.has(group)) {
      seenGroup.add(group);
      groupOrder.push(group);
    }
    const key = `${group}\0${bin}`;
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { rows: [], sampleRow: i };
      buckets.set(key, bucket);
    }
    bucket.rows.push(i);
  }
  return { buckets, groupOrder, dropped };
}

export function statSummaryBin(input: SummaryBinStatInput): SummaryBinStatResult {
  const { x, y } = input;
  const params = input.params ?? {};
  const fun: SummaryFunName = params.fun ?? "mean";
  const carriedNames = Object.keys(input.carried ?? {});
  const usedDefaultBins = params.bins === undefined && params.binwidth === undefined;

  const empty = (dropped: number): SummaryBinStatResult => ({
    x: new Float64Array(0),
    xmin: new Float64Array(0),
    xmax: new Float64Array(0),
    y: new Float64Array(0),
    ymin: new Float64Array(0),
    ymax: new Float64Array(0),
    groups: [],
    carried: Object.fromEntries(carriedNames.map((n) => [n, []])),
    dropped,
    usedDefaultBins,
    cut: { fuzzy: [], rightClosed: true, binIndex: new Int32Array(0) },
  });

  const extent = finiteExtent(x);
  if (extent === undefined) return empty(x.length);

  const closed = params.closed ?? "right";
  const range: [number, number] = input.range ?? extent;
  const breaks =
    params.binwidth === undefined
      ? binBreaksBins(range, params.bins ?? 30, params.boundary, params.center, closed)
      : binBreaksWidth(range, params.binwidth, params.boundary, params.center, closed);
  const binCount = breaks.breaks.length - 1;

  const { buckets, groupOrder, dropped } = collectBuckets(input, breaks);

  const outX: number[] = [];
  const outXmin: number[] = [];
  const outXmax: number[] = [];
  const outY: number[] = [];
  const outYmin: number[] = [];
  const outYmax: number[] = [];
  const outGroups: number[] = [];
  const sampleRows: number[] = [];
  const outBinIndex: number[] = [];

  for (const g of groupOrder) {
    for (let bin = 0; bin < binCount; bin++) {
      const bucket = buckets.get(`${g}\0${bin}`);
      if (bucket === undefined || bucket.rows.length === 0) continue;
      const lo = breaks.breaks[bin]!;
      const hi = breaks.breaks[bin + 1]!;
      const values = bucket.rows.map((row) => y[row]!);
      const summarized = summarizeValues(values, fun, params.funMin, params.funMax);
      outX.push((lo + hi) / 2);
      outXmin.push(lo);
      outXmax.push(hi);
      outY.push(summarized.y);
      outYmin.push(summarized.ymin);
      outYmax.push(summarized.ymax);
      outGroups.push(g);
      sampleRows.push(bucket.sampleRow);
      outBinIndex.push(bin);
    }
  }

  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) {
    const src = input.carried![name]!;
    carried[name] = sampleRows.map((row) => src[row]!);
  }

  return {
    x: Float64Array.from(outX),
    xmin: Float64Array.from(outXmin),
    xmax: Float64Array.from(outXmax),
    y: Float64Array.from(outY),
    ymin: Float64Array.from(outYmin),
    ymax: Float64Array.from(outYmax),
    groups: outGroups,
    carried,
    dropped,
    usedDefaultBins,
    cut: {
      fuzzy: breaks.fuzzy,
      rightClosed: breaks.rightClosed,
      binIndex: Int32Array.from(outBinIndex),
    },
  };
}
