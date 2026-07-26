/**
 * The contour stat (ggplot2's stat_contour isolines; #801 v1).
 *
 * Clean-room marching-squares isolines over a regular x×y grid. No R/C++ code.
 *
 * Contract:
 *  - required: continuous x, y, z; complete rectangular grid per group
 *    (every unique x × unique y present exactly once with finite z preferred)
 *  - levels: params.breaks, else evenly spaced bins from min..max (inclusive)
 *  - outputs one open polyline vertex stream per (group × level × piece)
 *  - after_stat: level (numeric contour value)
 *  - incomplete grids: incomplete cells skipped (missing/NaN corners)
 *  - contour_filled deferred
 */
import type { CellValue } from "../table.js";

export interface ContourParamsInput {
  bins?: number | undefined;
  breaks?: readonly number[] | undefined;
  binwidth?: number | undefined;
}

export interface ContourStatInput {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: ContourParamsInput;
}

export interface ContourStatResult {
  x: Float64Array;
  y: Float64Array;
  level: Float64Array;
  groups: number[];
  /** Piece id within (group, level) for multi-component isolines. */
  piece: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  droppedGroups: number;
}

type Pt = { x: number; y: number };

function uniqueSorted(values: Float64Array, finiteMask: boolean[]): number[] {
  const set = new Set<number>();
  for (let i = 0; i < values.length; i++) {
    if (finiteMask[i] !== true) continue;
    const v = values[i]!;
    if (Number.isFinite(v)) set.add(v);
  }
  return [...set].toSorted((a, b) => a - b);
}

/** Resolve contour levels from breaks / bins / binwidth. */
export function contourLevels(zmin: number, zmax: number, params: ContourParamsInput): number[] {
  if (params.breaks !== undefined && params.breaks.length > 0) {
    return params.breaks.filter((v) => Number.isFinite(v)).toSorted((a, b) => a - b);
  }
  if (!(zmax > zmin)) return [];
  if (params.binwidth !== undefined && params.binwidth > 0) {
    const w = params.binwidth;
    const start = Math.ceil(zmin / w) * w;
    const levels: number[] = [];
    for (let v = start; v <= zmax + w * 1e-12; v += w) {
      if (v >= zmin - 1e-12 && v <= zmax + 1e-12) levels.push(v);
    }
    return levels;
  }
  const bins = params.bins ?? 10;
  if (bins < 1) return [];
  if (bins === 1) return [(zmin + zmax) / 2];
  const levels: number[] = [];
  for (let i = 0; i < bins; i++) {
    levels.push(zmin + ((zmax - zmin) * i) / (bins - 1));
  }
  return levels;
}

function edgeInterp(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  level: number,
): Pt {
  const d = bz - az;
  const t = Math.abs(d) < 1e-15 ? 0.5 : (level - az) / d;
  const u = Math.min(1, Math.max(0, t));
  return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u };
}

/** Emit 0–2 undirected segments for one cell at one level (marching squares). */
export function cellSegments(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z00: number,
  z10: number,
  z01: number,
  z11: number,
  level: number,
): Array<[Pt, Pt]> {
  if (![z00, z10, z01, z11].every((z) => Number.isFinite(z)) || !Number.isFinite(level)) {
    return [];
  }
  // Bitmask: corner ≥ level. corners: 0=SW, 1=SE, 2=NE, 3=NW
  let mask = 0;
  if (z00 >= level) mask |= 1;
  if (z10 >= level) mask |= 2;
  if (z11 >= level) mask |= 4;
  if (z01 >= level) mask |= 8;
  if (mask === 0 || mask === 15) return [];

  const bottom = () => edgeInterp(x0, y0, z00, x1, y0, z10, level);
  const right = () => edgeInterp(x1, y0, z10, x1, y1, z11, level);
  const top = () => edgeInterp(x0, y1, z01, x1, y1, z11, level);
  const left = () => edgeInterp(x0, y0, z00, x0, y1, z01, level);

  // Standard MS cases (pair opposite edges; saddle uses average).
  switch (mask) {
    case 1:
    case 14:
      return [[bottom(), left()]];
    case 2:
    case 13:
      return [[bottom(), right()]];
    case 3:
    case 12:
      return [[left(), right()]];
    case 4:
    case 11:
      return [[right(), top()]];
    case 5: {
      // saddle
      const avg = (z00 + z10 + z01 + z11) / 4;
      return avg >= level
        ? [
            [bottom(), right()],
            [left(), top()],
          ]
        : [
            [bottom(), left()],
            [right(), top()],
          ];
    }
    case 6:
    case 9:
      return [[bottom(), top()]];
    case 7:
    case 8:
      return [[left(), top()]];
    case 10: {
      const avg = (z00 + z10 + z01 + z11) / 4;
      return avg >= level
        ? [
            [bottom(), left()],
            [right(), top()],
          ]
        : [
            [bottom(), right()],
            [left(), top()],
          ];
    }
    default:
      return [];
  }
}

function keyPt(p: Pt): string {
  // Round to avoid float join failures.
  return `${p.x.toFixed(9)},${p.y.toFixed(9)}`;
}

/** Marching-squares segments for every complete cell on a regular grid. */
function gridCellSegments(
  xs: readonly number[],
  ys: readonly number[],
  grid: readonly (readonly (number | null)[])[],
  level: number,
): Array<[Pt, Pt]> {
  const segs: Array<[Pt, Pt]> = [];
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const z00 = grid[j]![i];
      const z10 = grid[j]![i + 1];
      const z01 = grid[j + 1]![i];
      const z11 = grid[j + 1]![i + 1];
      // Inner index can be undefined when a row is short; skip incomplete cells.
      if (
        z00 === null ||
        z00 === undefined ||
        z10 === null ||
        z10 === undefined ||
        z01 === null ||
        z01 === undefined ||
        z11 === null ||
        z11 === undefined
      ) {
        continue;
      }
      segs.push(...cellSegments(xs[i]!, xs[i + 1]!, ys[j]!, ys[j + 1]!, z00, z10, z01, z11, level));
    }
  }
  return segs;
}

/** Stitch undirected segments into polylines (open or closed). */
export function stitchSegments(segments: Array<[Pt, Pt]>): Pt[][] {
  if (segments.length === 0) return [];
  type Edge = { a: string; b: string; pa: Pt; pb: Pt; used: boolean };
  const edges: Edge[] = segments.map(([pa, pb]) => ({
    a: keyPt(pa),
    b: keyPt(pb),
    pa,
    pb,
    used: false,
  }));
  const adj = new Map<string, number[]>();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(i);
    adj.get(e.b)!.push(i);
  }

  const polylines: Pt[][] = [];
  for (let start = 0; start < edges.length; start++) {
    if (edges[start]!.used) continue;
    // Prefer starting at an endpoint (degree 1).
    let seed = start;
    for (let i = start; i < edges.length; i++) {
      if (edges[i]!.used) continue;
      const da = adj.get(edges[i]!.a)?.filter((j) => !edges[j]!.used).length ?? 0;
      const db = adj.get(edges[i]!.b)?.filter((j) => !edges[j]!.used).length ?? 0;
      if (da === 1 || db === 1) {
        seed = i;
        break;
      }
    }
    const e0 = edges[seed]!;
    e0.used = true;
    const chain: Pt[] = [e0.pa, e0.pb];
    // Extend forward from pb
    let head = e0.b;
    let guard = 0;
    while (guard++ < edges.length + 2) {
      const cand = (adj.get(head) ?? []).find((j) => !edges[j]!.used);
      if (cand === undefined) break;
      const e = edges[cand]!;
      e.used = true;
      if (e.a === head) {
        chain.push(e.pb);
        head = e.b;
      } else {
        chain.push(e.pa);
        head = e.a;
      }
    }
    // Extend backward from pa
    let tail = e0.a;
    guard = 0;
    while (guard++ < edges.length + 2) {
      const cand = (adj.get(tail) ?? []).find((j) => !edges[j]!.used);
      if (cand === undefined) break;
      const e = edges[cand]!;
      e.used = true;
      if (e.a === tail) {
        chain.unshift(e.pb);
        tail = e.b;
      } else {
        chain.unshift(e.pa);
        tail = e.a;
      }
    }
    if (chain.length >= 2) polylines.push(chain);
  }
  return polylines;
}

export function statContour(input: ContourStatInput): ContourStatResult {
  const { x, y, z, groups } = input;
  const params = input.params ?? {};
  const carriedNames = Object.keys(input.carried ?? {});

  // Group order first-seen
  const groupOrder: number[] = [];
  const groupRows = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < x.length; i++) {
    const ok = Number.isFinite(x[i]!) && Number.isFinite(y[i]!) && Number.isFinite(z[i]!);
    if (!ok) {
      dropped++;
      continue;
    }
    const g = groups[i]!;
    let list = groupRows.get(g);
    if (list === undefined) {
      list = [];
      groupRows.set(g, list);
      groupOrder.push(g);
    }
    list.push(i);
  }

  const outX: number[] = [];
  const outY: number[] = [];
  const outLevel: number[] = [];
  const outGroups: number[] = [];
  const outPiece: number[] = [];
  const sampleRows: number[] = [];
  let droppedGroups = 0;

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    const mask = rows.map(() => true);
    const gx = Float64Array.from(rows, (r) => x[r]!);
    const gy = Float64Array.from(rows, (r) => y[r]!);
    const gz = Float64Array.from(rows, (r) => z[r]!);
    const xs = uniqueSorted(gx, mask);
    const ys = uniqueSorted(gy, mask);
    if (xs.length < 2 || ys.length < 2) {
      droppedGroups++;
      continue;
    }
    const xi = new Map(xs.map((v, i) => [v, i]));
    const yi = new Map(ys.map((v, i) => [v, i]));
    const grid: (number | null)[][] = Array.from({ length: ys.length }, () =>
      Array.from({ length: xs.length }, () => null),
    );
    for (let k = 0; k < rows.length; k++) {
      const i = xi.get(gx[k]!)!;
      const j = yi.get(gy[k]!)!;
      grid[j]![i] = gz[k]!;
    }

    let zmin = Infinity;
    let zmax = -Infinity;
    for (const row of grid) {
      for (const v of row) {
        if (v === null || !Number.isFinite(v)) continue;
        if (v < zmin) zmin = v;
        if (v > zmax) zmax = v;
      }
    }
    if (!(zmax > zmin) && params.breaks === undefined) {
      droppedGroups++;
      continue;
    }
    const levels = contourLevels(
      Number.isFinite(zmin) ? zmin : 0,
      Number.isFinite(zmax) ? zmax : 1,
      params,
    );
    if (levels.length === 0) {
      droppedGroups++;
      continue;
    }

    const sample = rows[0]!;
    let pieceCounter = 0;
    for (const level of levels) {
      const segs = gridCellSegments(xs, ys, grid, level);
      const lines = stitchSegments(segs);
      for (const line of lines) {
        const piece = pieceCounter++;
        for (const p of line) {
          outX.push(p.x);
          outY.push(p.y);
          outLevel.push(level);
          outGroups.push(g);
          outPiece.push(piece);
          sampleRows.push(sample);
        }
      }
    }
  }

  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) {
    const src = input.carried![name]!;
    carried[name] = sampleRows.map((row) => src[row]!);
  }

  return {
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    level: Float64Array.from(outLevel),
    groups: outGroups,
    piece: outPiece,
    carried,
    dropped,
    droppedGroups,
  };
}
