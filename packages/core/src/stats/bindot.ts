/**
 * The bindot stat (ggplot2's StatBindot subset — histodot only; #803).
 *
 * Stat output contract:
 *  - required inputs: continuous x. y must NOT be mapped (computed-y-mapped).
 *  - generated columns (one row per kept observation):
 *      `stackpos` — stack position (ggsvelte after_stat name; not a ggplot2
 *        after_stat export — y defaults to { stat: "stackpos" })
 *      `count` — occupancy of that (group, bin)
 *      `x` / `xmin` / `xmax` — histodot bin center and edges
 *  - method: histodot only (fixed breaks via bin-breaks; shared layer-wide)
 *  - stackdir: up | down | center | centerwhole; stackratio multiplies ranks
 *  - zero-count bins omitted (divergence from stat_bin which keeps them)
 *  - missing / non-finite / out-of-range x dropped (`dropped`)
 *
 * Deferred: Wilkinson dotdensity, binaxis=y, weights.
 */
import type { CellValue } from "../table.js";

import { binBreaksBins, binBreaksWidth, binIndexOf } from "./bin-breaks.js";

type BindotStackdir = "up" | "down" | "center" | "centerwhole";

interface BindotParamsInput {
  bins?: number | undefined;
  binwidth?: number | undefined;
  boundary?: number | undefined;
  center?: number | undefined;
  closed?: "right" | "left" | undefined;
  stackdir?: BindotStackdir | undefined;
  stackratio?: number | undefined;
  /** Multiplier on data-unit diameter (geometry); default 1. */
  dotsize?: number | undefined;
  size?: number | undefined;
  alpha?: number | undefined;
  shape?: string | undefined;
}

export interface BindotStatInput {
  x: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: BindotParamsInput;
  /** Facet fixed-x shared break range override. */
  range?: [number, number];
}

export interface BindotStatResult {
  x: Float64Array;
  xmin: Float64Array;
  xmax: Float64Array;
  stackpos: Float64Array;
  count: Float64Array;
  groups: number[];
  /** Source input row per output row (for aesthetics + candidates). */
  sourceRows: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  usedDefaultBins: boolean;
  /** Effective uniform bin width (data units) for geometry sizing. */
  effectiveBinwidth: number;
}

function stackPosition(
  rank: number,
  k: number,
  stackdir: BindotStackdir,
  stackratio: number,
): number {
  switch (stackdir) {
    case "down":
      return -rank * stackratio;
    case "center":
      return (rank - (k + 1) / 2) * stackratio;
    case "centerwhole":
      return (rank - Math.ceil(k / 2)) * stackratio;
    default:
      // up
      return rank * stackratio;
  }
}

export function statBindot(input: BindotStatInput): BindotStatResult {
  const { x, groups } = input;
  const params = input.params ?? {};
  const carriedNames = Object.keys(input.carried ?? {});
  const usedDefaultBins = params.bins === undefined && params.binwidth === undefined;
  const stackdir: BindotStackdir = params.stackdir ?? "up";
  const stackratio = params.stackratio ?? 1;

  const empty = (dropped: number): BindotStatResult => ({
    x: new Float64Array(0),
    xmin: new Float64Array(0),
    xmax: new Float64Array(0),
    stackpos: new Float64Array(0),
    count: new Float64Array(0),
    groups: [],
    sourceRows: [],
    carried: Object.fromEntries(carriedNames.map((n) => [n, []])),
    dropped,
    usedDefaultBins,
    effectiveBinwidth: 0,
  });

  let min = Infinity;
  let max = -Infinity;
  let finite = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    if (!Number.isFinite(v)) continue;
    finite++;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (finite === 0) return empty(x.length);

  const closed = params.closed ?? "right";
  const range: [number, number] = input.range ?? [min, max];
  const breaks =
    params.binwidth === undefined
      ? binBreaksBins(range, params.bins ?? 30, params.boundary, params.center, closed)
      : binBreaksWidth(range, params.binwidth, params.boundary, params.center, closed);
  const binCount = breaks.breaks.length - 1;
  const effectiveBinwidth =
    binCount > 0 ? breaks.breaks[1]! - breaks.breaks[0]! : (params.binwidth ?? 0);

  // Collect kept rows per (group, bin), preserving input order within bucket.
  type Bucket = { rows: number[] };
  const buckets = new Map<string, Bucket>();
  const groupOrder: number[] = [];
  const seenGroup = new Set<number>();
  let dropped = x.length - finite;

  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    if (!Number.isFinite(v)) continue;
    const bin = binIndexOf(v, breaks.fuzzy, breaks.rightClosed);
    if (bin < 0 || bin >= binCount) {
      dropped++;
      continue;
    }
    const g = groups[i]!;
    if (!seenGroup.has(g)) {
      seenGroup.add(g);
      groupOrder.push(g);
    }
    const key = `${g}\0${bin}`;
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { rows: [] };
      buckets.set(key, bucket);
    }
    bucket.rows.push(i);
  }

  // Emit in first-seen group order, then ascending bin index, then input order.
  const outX: number[] = [];
  const outXmin: number[] = [];
  const outXmax: number[] = [];
  const outStack: number[] = [];
  const outCount: number[] = [];
  const outGroups: number[] = [];
  const outSource: number[] = [];

  for (const g of groupOrder) {
    for (let bin = 0; bin < binCount; bin++) {
      const bucket = buckets.get(`${g}\0${bin}`);
      if (bucket === undefined || bucket.rows.length === 0) continue;
      const k = bucket.rows.length;
      const lo = breaks.breaks[bin]!;
      const hi = breaks.breaks[bin + 1]!;
      const center = (lo + hi) / 2;
      for (let r = 0; r < k; r++) {
        const src = bucket.rows[r]!;
        outX.push(center);
        outXmin.push(lo);
        outXmax.push(hi);
        outStack.push(stackPosition(r + 1, k, stackdir, stackratio));
        outCount.push(k);
        outGroups.push(g);
        outSource.push(src);
      }
    }
  }

  const n = outX.length;
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) {
    const src = input.carried![name]!;
    const col: CellValue[] = Array.from({ length: n });
    for (let i = 0; i < n; i++) col[i] = src[outSource[i]!]!;
    carried[name] = col;
  }

  return {
    x: Float64Array.from(outX),
    xmin: Float64Array.from(outXmin),
    xmax: Float64Array.from(outXmax),
    stackpos: Float64Array.from(outStack),
    count: Float64Array.from(outCount),
    groups: outGroups,
    sourceRows: outSource,
    carried,
    dropped,
    usedDefaultBins,
    effectiveBinwidth,
  };
}
