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
  /** Source row per output row: the observed row when the grid x coincides
   * with a group's own (last-wins) sample; -1 for interpolated or
   * zero-extended cells. Lets frames keep inspection lineage for real data. */
  readonly sourceRows: Int32Array;
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

/** Collapse a group's rows to sorted unique x with last-wins y.
 * `rows` carries the winning source row per unique x (same last-wins). */
export function seriesFromRows(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
): { xs: Float64Array; ys: Float64Array; rows: number[] } | null {
  const pts: { x: number; y: number; row: number }[] = [];
  for (const row of rows) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    pts.push({ x: xv, y: yv, row });
  }
  if (pts.length === 0) return null;
  pts.sort((a, b) => a.x - b.x || 0);
  // Last-wins for duplicate x
  const uniqX: number[] = [];
  const uniqY: number[] = [];
  const uniqRow: number[] = [];
  for (const p of pts) {
    if (uniqX.length > 0 && uniqX.at(-1) === p.x) {
      uniqY[uniqY.length - 1] = p.y;
      uniqRow[uniqRow.length - 1] = p.row;
    } else {
      uniqX.push(p.x);
      uniqY.push(p.y);
      uniqRow.push(p.row);
    }
  }
  return { xs: Float64Array.from(uniqX), ys: Float64Array.from(uniqY), rows: uniqRow };
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
  const outRow: number[] = [];
  const carriedOut: Record<string, CellValue[]> = {};
  for (const key of Object.keys(carried)) carriedOut[key] = [];

  const groupIds = [...byGroup.keys()].toSorted((a, b) => a - b);
  for (const g of groupIds) {
    const rows = byGroup.get(g)!;
    const series = seriesFromRows(x, y, rows);
    if (series === null) continue;
    const rep = rows[0]!;
    // Grid and series are both ascending. One merge cursor advances to the
    // first sample with xs[cursor] >= xq and supplies both source-row lineage
    // and the interpolation bracket (right endpoint, or exact hit). That
    // replaces a binary search per grid point (#1336).
    let cursor = 0;
    const xs = series.xs;
    const ys = series.ys;
    const n = xs.length;
    for (let i = 0; i < grid.length; i++) {
      const xq = grid[i]!;
      while (cursor < n && xs[cursor]! < xq) cursor++;
      let yq = 0;
      if (cursor < n && xs[cursor] === xq) {
        yq = ys[cursor]!;
      } else if (cursor > 0 && cursor < n) {
        const x0 = xs[cursor - 1]!;
        const y0 = ys[cursor - 1]!;
        const x1 = xs[cursor]!;
        const y1 = ys[cursor]!;
        const t = (xq - x0) / (x1 - x0);
        yq = y0 + t * (y1 - y0);
      }
      // else: cursor === 0 (before first) or cursor === n (after last) → 0
      outX.push(xq);
      outY.push(yq);
      outG.push(g);
      outRow.push(cursor < n && xs[cursor] === xq ? series.rows[cursor]! : -1);
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
    sourceRows: Int32Array.from(outRow),
  };
}
