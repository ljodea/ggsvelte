/**
 * stat_align — interpolate series onto a shared x grid (#815).
 * Clean-room contract for stacking continuous-x area/line.
 *
 * Shared grid = sorted unique finite x across all groups.
 * Per group: linear interpolation of y onto the grid; outside the group's
 * observed x range, y = 0 (stack-friendly; matches positionStack's
 * non-finite→zero-height treatment).
 *
 * Within a group, duplicate x keeps the last finite y (stable last-wins).
 */

import type { CellValue } from "../table.js";

export interface StatAlignInput {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: readonly number[];
  readonly carried: Readonly<Record<string, readonly CellValue[]>>;
}

export interface StatAlignResult {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: number[];
  readonly carried: Record<string, CellValue[]>;
  readonly dropped: number;
}

/** Linear interpolate y at query x given sorted unique (x,y) series. Outside range → 0. */
export function lerpSeries(xs: Float64Array, ys: Float64Array, query: number): number {
  const n = xs.length;
  if (n === 0 || !Number.isFinite(query)) return 0;
  if (n === 1) return query === xs[0]! ? ys[0]! : 0;
  if (query < xs[0]! || query > xs[n - 1]!) return 0;
  // Binary search for rightmost xs[i] <= query
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid]! <= query) lo = mid;
    else hi = mid - 1;
  }
  const xLo = xs[lo]!;
  const yLo = ys[lo]!;
  if (xLo === query) return yLo;
  if (lo === n - 1) return yLo;
  const x1 = xs[lo + 1]!;
  const y1 = ys[lo + 1]!;
  const t = (query - xLo) / (x1 - xLo);
  return yLo + t * (y1 - yLo);
}

/** Collapse a group's rows to sorted unique x with last-wins y. */
export function seriesFromRows(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
): { xs: Float64Array; ys: Float64Array } | null {
  const pts: { x: number; y: number }[] = [];
  for (const row of rows) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    pts.push({ x: xv, y: yv });
  }
  if (pts.length === 0) return null;
  pts.sort((a, b) => a.x - b.x || 0);
  // Last-wins for duplicate x
  const uniqX: number[] = [];
  const uniqY: number[] = [];
  for (const p of pts) {
    if (uniqX.length > 0 && uniqX.at(-1) === p.x) {
      uniqY[uniqY.length - 1] = p.y;
    } else {
      uniqX.push(p.x);
      uniqY.push(p.y);
    }
  }
  return { xs: Float64Array.from(uniqX), ys: Float64Array.from(uniqY) };
}

export function statAlign(input: StatAlignInput): StatAlignResult {
  const { x, y, groups, carried } = input;
  const byGroup = new Map<number, number[]>();
  let dropped = 0;
  const allX = new Set<number>();

  for (let row = 0; row < x.length; row++) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      dropped++;
      continue;
    }
    allX.add(xv);
    const g = groups[row] ?? 0;
    let list = byGroup.get(g);
    if (list === undefined) {
      list = [];
      byGroup.set(g, list);
    }
    list.push(row);
  }

  const grid = Float64Array.from([...allX].toSorted((a, b) => a - b));
  const outX: number[] = [];
  const outY: number[] = [];
  const outG: number[] = [];
  const carriedOut: Record<string, CellValue[]> = {};
  for (const key of Object.keys(carried)) carriedOut[key] = [];

  const groupIds = [...byGroup.keys()].toSorted((a, b) => a - b);
  for (const g of groupIds) {
    const rows = byGroup.get(g)!;
    const series = seriesFromRows(x, y, rows);
    if (series === null) continue;
    const rep = rows[0]!;
    for (let i = 0; i < grid.length; i++) {
      const xq = grid[i]!;
      outX.push(xq);
      outY.push(lerpSeries(series.xs, series.ys, xq));
      outG.push(g);
      for (const key of Object.keys(carriedOut)) {
        carriedOut[key]!.push(carried[key]![rep]!);
      }
    }
  }

  return {
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    groups: outG,
    carried: carriedOut,
    dropped,
  };
}
