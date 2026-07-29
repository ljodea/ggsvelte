/**
 * The density_2d stat (ggplot2's stat_density_2d isolines; #802 v1).
 *
 * Clean-room bivariate product-Gaussian KDE + isolines via contour MS helpers
 * (shared with #801 `stats/contour.ts`). No MASS/R source.
 *
 * Bandwidth: MASS::bandwidth.nrd then kde2d's h/4 scaling (fixture-oriented).
 * Grid: n×n over data range expanded by 5% each side (approx ggplot expand).
 * Contour levels: contourLevels(breaks | bins | binwidth) of the density surface.
 * KDE surface: sorted-x sliding window (same ±8σ product kernel as a full
 * G²·n scan; fewer examinations when bandwidth is local).
 *
 * Filled v1 (#802 phase 2): closed isoline rings only (open rings dropped).
 * True isobands between consecutive levels deferred.
 * Deferred: contour_var other than density, weights.
 */
import type { CellValue } from "../table.js";

import { cellSegments, contourLevels, stitchSegments } from "./contour.js";
import { quantile7, sampleSD } from "./numeric.js";

interface Density2dParamsInput {
  /** Bandwidth: one number for both axes, or [hx, hy]. */
  h?: number | readonly number[] | undefined;
  adjust?: number | undefined;
  /** Grid resolution per axis (default 100). */
  n?: number | undefined;
  bins?: number | undefined;
  breaks?: readonly number[] | undefined;
  binwidth?: number | undefined;
  /**
   * When true, keep only closed isoline rings for filled bands (density_2d_filled).
   * Open (boundary-touching) rings are dropped.
   */
  filled?: boolean | undefined;
}

export interface Density2dStatInput {
  x: Float64Array;
  y: Float64Array;
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: Density2dParamsInput;
}

export interface Density2dStatResult {
  x: Float64Array;
  y: Float64Array;
  level: Float64Array;
  density: Float64Array;
  groups: number[];
  piece: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  droppedGroups: number;
  /** Open rings dropped when params.filled (for warnings). */
  openRingsDropped: number;
}

/** Whether a stitched polyline closes on itself (filled-ring eligibility). */
export function isClosedRing(line: readonly { x: number; y: number }[], eps = 1e-9): boolean {
  if (line.length < 3) return false;
  const a = line.at(0)!;
  const b = line.at(-1)!;
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}

/**
 * MASS::bandwidth.nrd — 4 * 1.06 * min(sd, IQR/1.34) * n^(-1/5).
 * kde2d then divides by 4 → effective 1.06 * s * n^(-1/5).
 */
export function bandwidthNRD(sorted: Float64Array): number {
  const n = sorted.length;
  if (n < 2) return 1;
  const hi = sampleSD(sorted);
  const iqr = quantile7(sorted, 0.75) - quantile7(sorted, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (!(lo > 0)) {
    lo = hi > 0 ? hi : Math.abs(sorted[0]!) || 1;
  }
  return 4 * 1.06 * lo * Math.pow(n, -0.2);
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function dnorm(u: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * u * u);
}

export type ProductKdeGridOptions = {
  /**
   * When true, also return how many (grid-cell, sample) pairs the inner loop
   * examined (post x-window admission). Used by complexity tests only.
   */
  countExaminations?: boolean;
};

export type ProductKdeGridResult = number[][] & {
  examinations?: number;
};

/**
 * Product-Gaussian KDE on a regular grid.
 *
 * Samples are sorted once by x; each grid row slides an x-window across
 * ascending `gx` so far-away points are never visited — O(G·n + work) average
 * vs a full O(G²·n) scan of every sample at every cell. Same ±8σ truncation
 * and invN scaling as the historical direct product (MASS::kde2d-shaped).
 */
export function productKdeGrid(
  xs: Float64Array,
  ys: Float64Array,
  gx: Float64Array,
  gy: Float64Array,
  hx: number,
  hy: number,
  options: ProductKdeGridOptions = {},
): ProductKdeGridResult {
  const nx = xs.length;
  const gridNX = gx.length;
  const gridNY = gy.length;
  const z: ProductKdeGridResult = Array.from({ length: gridNY }, () =>
    Array.from({ length: gridNX }, () => 0),
  );
  if (nx === 0 || gridNX === 0 || gridNY === 0 || !(hx > 0) || !(hy > 0)) {
    if (options.countExaminations === true) z.examinations = 0;
    return z;
  }

  const order = Array.from({ length: nx }, (_, i) => i).toSorted(
    (a, b) => xs[a]! - xs[b]! || a - b,
  );
  const sortedX = new Float64Array(nx);
  const sortedY = new Float64Array(nx);
  for (let i = 0; i < nx; i++) {
    sortedX[i] = xs[order[i]!]!;
    sortedY[i] = ys[order[i]!]!;
  }

  const wx = 8 * hx;
  const wy = 8 * hy;
  const invN = 1 / (nx * hx * hy);
  let examinations = 0;
  const count = options.countExaminations === true;

  for (let j = 0; j < gridNY; j++) {
    const yj = gy[j]!;
    let lo = 0;
    for (let i = 0; i < gridNX; i++) {
      const xi = gx[i]!;
      const xLo = xi - wx;
      const xHi = xi + wx;
      while (lo < nx && sortedX[lo]! < xLo) lo++;
      let s = 0;
      for (let k = lo; k < nx; k++) {
        const xv = sortedX[k]!;
        if (xv > xHi) break;
        if (count) examinations++;
        const dy = yj - sortedY[k]!;
        if (Math.abs(dy) > wy) continue;
        const dx = xi - xv;
        s += dnorm(dx / hx) * dnorm(dy / hy);
      }
      z[j]![i] = s * invN;
    }
  }

  if (count) z.examinations = examinations;
  return z;
}

function expandRange(min: number, max: number, mul = 0.05): [number, number] {
  if (!(max > min)) {
    const pad = Math.abs(min) || 1;
    return [min - pad * mul, max + pad * mul];
  }
  const mid = (min + max) / 2;
  const half = ((max - min) / 2) * (1 + mul);
  return [mid - half, mid + half];
}

function linspace(from: number, to: number, n: number): Float64Array {
  const out = new Float64Array(n);
  if (n === 1) {
    out[0] = from;
    return out;
  }
  const step = (to - from) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = from + i * step;
  return out;
}

function resolveH(
  xs: Float64Array,
  ys: Float64Array,
  params: Density2dParamsInput,
): [number, number] {
  const adjust = params.adjust ?? 1;
  const h = params.h;
  let hx: number;
  let hy: number;
  if (h === undefined) {
    const sx = Float64Array.from(xs).toSorted((a, b) => a - b);
    const sy = Float64Array.from(ys).toSorted((a, b) => a - b);
    hx = bandwidthNRD(sx);
    hy = bandwidthNRD(sy);
  } else if (typeof h === "number") {
    if (!(h > 0)) throw new Error("density_2d: params.h must be > 0");
    hx = h;
    hy = h;
  } else if (h.length >= 2) {
    // readonly number[] branch of params.h (not a bare number).
    const hx0 = h[0]!;
    const hy0 = h[1]!;
    if (!(hx0 > 0) || !(hy0 > 0)) {
      throw new Error("density_2d: params.h entries must be > 0");
    }
    hx = hx0;
    hy = hy0;
  } else {
    throw new Error("density_2d: params.h must be a number or [hx, hy]");
  }
  // MASS::kde2d scales bandwidth.nrd by 1/4
  return [(hx * adjust) / 4, (hy * adjust) / 4];
}

export function statDensity2d(input: Density2dStatInput): Density2dStatResult {
  const { x, y, groups } = input;
  const params = input.params ?? {};
  const gridN = params.n ?? 100;
  const carriedNames = Object.keys(input.carried ?? {});

  const groupOrder: number[] = [];
  const groupRows = new Map<number, number[]>();
  let dropped = 0;
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]!) || !Number.isFinite(y[i]!)) {
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
  const outDensity: number[] = [];
  const outGroups: number[] = [];
  const outPiece: number[] = [];
  const sampleRows: number[] = [];
  let droppedGroups = 0;
  let openRingsDropped = 0;
  const filled = params.filled === true;

  for (const g of groupOrder) {
    const rows = groupRows.get(g)!;
    if (rows.length < 2) {
      droppedGroups++;
      continue;
    }
    const nx = rows.length;
    const xs = new Float64Array(nx);
    const ys = new Float64Array(nx);
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let j = 0; j < nx; j++) {
      const xv = x[rows[j]!]!;
      const yv = y[rows[j]!]!;
      xs[j] = xv;
      ys[j] = yv;
      if (xv < xmin) xmin = xv;
      if (xv > xmax) xmax = xv;
      if (yv < ymin) ymin = yv;
      if (yv > ymax) ymax = yv;
    }

    let hx: number;
    let hy: number;
    try {
      [hx, hy] = resolveH(xs, ys, params);
    } catch {
      droppedGroups++;
      continue;
    }
    if (!(hx > 0) || !(hy > 0)) {
      droppedGroups++;
      continue;
    }

    const [x0, x1] = expandRange(xmin, xmax, 0.05);
    const [y0, y1] = expandRange(ymin, ymax, 0.05);
    const gx = linspace(x0, x1, gridN);
    const gy = linspace(y0, y1, gridN);
    // Sorted-x sliding window (same ±8σ / invN contract as the direct product).
    const z = productKdeGrid(xs, ys, gx, gy, hx, hy);

    let zmin = Infinity;
    let zmax = -Infinity;
    for (let j = 0; j < gridN; j++) {
      for (let i = 0; i < gridN; i++) {
        const v = z[j]![i]!;
        if (v < zmin) zmin = v;
        if (v > zmax) zmax = v;
      }
    }
    const levels = contourLevels(zmin, zmax, {
      bins: params.bins,
      breaks: params.breaks,
      binwidth: params.binwidth,
    });
    if (levels.length === 0 || !(zmax > zmin)) {
      droppedGroups++;
      continue;
    }

    const sample = rows[0]!;
    let pieceCounter = 0;
    for (const level of levels) {
      // Endpoints of the density surface rarely produce isolines.
      if (level <= zmin || level >= zmax) continue;
      const segs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
      for (let j = 0; j < gridN - 1; j++) {
        for (let i = 0; i < gridN - 1; i++) {
          segs.push(
            ...cellSegments(
              gx[i]!,
              gx[i + 1]!,
              gy[j]!,
              gy[j + 1]!,
              z[j]![i]!,
              z[j]![i + 1]!,
              z[j + 1]![i]!,
              z[j + 1]![i + 1]!,
              level,
            ),
          );
        }
      }
      const lines = stitchSegments(segs);
      for (const line of lines) {
        if (filled && !isClosedRing(line)) {
          openRingsDropped++;
          continue;
        }
        const piece = pieceCounter++;
        // Encode group as composite later in frame; store source group id here.
        for (const p of line) {
          outX.push(p.x);
          outY.push(p.y);
          outLevel.push(level);
          outDensity.push(level);
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
    density: Float64Array.from(outDensity),
    groups: outGroups,
    piece: outPiece,
    carried,
    dropped,
    droppedGroups,
    openRingsDropped,
  };
}
