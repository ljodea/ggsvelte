/**
 * The summary_rolling stat — a centered rolling-window summary over
 * continuous x (ggplot2 has no direct equivalent; closest is zoo::rollapply
 * with align = "center").
 *
 * Stat output contract:
 *  - required inputs: continuous numeric x and quantitative y.
 *  - params.window is REQUIRED (width in x data units, > 0). There is no
 *    silent default width — the spec validator raises
 *    "summary-rolling-window-required" and this module throws as the
 *    pipeline backstop.
 *  - one output row per (group, unique x): y = fun over the rows with
 *    |x − center| ≤ window/2 (both edges inclusive). fun defaults to mean.
 *  - partial windows at the series ends are KEPT (divergence from zoo's
 *    default NA padding): a running line reaches both ends of the data.
 *  - windows never cross groups, even at overlapping x.
 *  - generated columns: `x` (window center) and `y`. No ymin/ymax spread
 *    (v1 — a running line, not a band).
 *  - scale-space: x is already transformed when supplied; y is NOT
 *    re-transformed (summary values live in measure space).
 *  - no weight channel (v1).
 *
 * Complexity: O(n log n) sort per group, then a two-pointer sliding window
 * per center — O(n · w log w) with w the window row count (median needs a
 * sorted copy of each window).
 */
import type { CellValue } from "../table.js";

import { applySummaryFun, type SummaryFunName } from "./summary.js";

export interface SummaryRollingParamsInput {
  window?: number | undefined;
  fun?: SummaryFunName | undefined;
}

export interface SummaryRollingStatInput {
  x: Float64Array;
  y: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: SummaryRollingParamsInput;
}

export interface SummaryRollingStatResult {
  x: Float64Array;
  y: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
}

export function statSummaryRolling(input: SummaryRollingStatInput): SummaryRollingStatResult {
  const { x, y, groups, carried = {}, params = {} } = input;
  const window = params.window;
  if (window === undefined || !Number.isFinite(window) || window <= 0) {
    throw new Error(
      'statSummaryRolling: params.window is required (rolling-window width in x data units, > 0) — e.g. geomLine({ stat: "summary_rolling", window: 30 }).',
    );
  }
  const fun = params.fun ?? "mean";
  const half = window / 2;

  // Row order grouped by group id, x ascending within each group. Groups
  // appear in first-occurrence order (the pipeline's group id order).
  const n = x.length;
  const groupOrder: number[] = [];
  const byGroup = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) {
      dropped++;
      continue;
    }
    const g = groups[i]!;
    let rows = byGroup.get(g);
    if (rows === undefined) {
      rows = [];
      byGroup.set(g, rows);
      groupOrder.push(g);
    }
    rows.push(i);
  }

  const outX: number[] = [];
  const outY: number[] = [];
  const outGroups: number[] = [];
  const carriedKeys = Object.keys(carried);
  const carriedOut: Record<string, CellValue[]> = {};
  for (const key of carriedKeys) carriedOut[key] = [];

  for (const g of groupOrder) {
    const rows = byGroup.get(g)!;
    rows.sort((a, b) => x[a]! - x[b]!);
    const xs = rows.map((i) => x[i]!);
    const ys = rows.map((i) => y[i]!);

    // Two pointers bound each centered window; centers are the unique x
    // values in ascending order.
    let lo = 0;
    let hi = 0; // exclusive
    let j = 0;
    while (j < xs.length) {
      const center = xs[j]!;
      while (lo < xs.length && xs[lo]! < center - half) lo++;
      if (hi < lo) hi = lo;
      while (hi < xs.length && xs[hi]! <= center + half) hi++;
      const slice = ys.slice(lo, hi).toSorted((a, b) => a - b);
      outX.push(center);
      outY.push(applySummaryFun(fun, slice, true));
      outGroups.push(g);
      for (const key of carriedKeys) {
        carriedOut[key]!.push(carried[key]![rows[j]!]!);
      }
      // Skip duplicate centers (all rows at this x are already in the window).
      while (j < xs.length && xs[j] === center) j++;
    }
  }

  return {
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    groups: outGroups,
    carried: carriedOut,
    dropped,
  };
}
