/**
 * stat_ellipse — bivariate normal confidence ellipses per group (#812).
 * Clean-room linear algebra; type "norm" only (t/euclid deferred).
 *
 * For 2 df, χ² quantile: qchisq(p, 2) = −2 ln(1−p).
 * Ellipse: mean + sqrt(χ²) · R · [√λ1 cos θ, √λ2 sin θ].
 *
 * `segments` is the number of perimeter samples **before** the closing
 * duplicate; output length is segments + 1 (first point appended last).
 */

import { mean } from "./numeric.js";

export interface StatEllipseParams {
  /** Confidence level in (0, 1). Default 0.95. */
  level?: number;
  /** Ellipse construction type. Only "norm" in v1. */
  type?: string;
  /** Perimeter samples before closing duplicate. Default 51. */
  segments?: number;
}

export interface StatEllipseInput {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: readonly number[];
  readonly carried: Readonly<Record<string, readonly import("../table.js").CellValue[]>>;
  readonly params?: StatEllipseParams;
}

export interface StatEllipseResult {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: number[];
  readonly carried: Record<string, import("../table.js").CellValue[]>;
  readonly dropped: number;
  readonly droppedGroups: number;
}

/** χ² quantile with 2 degrees of freedom. */
export function qchisq2(level: number): number {
  if (!(level > 0 && level < 1)) return Number.NaN;
  return -2 * Math.log(1 - level);
}

/**
 * Sample covariance of finite (x,y) pairs (n−1 denominator).
 * Returns null when fewer than 2 finite points or degenerate (zero variance).
 */
export function sampleCov2(
  x: Float64Array,
  y: Float64Array,
  rows: readonly number[],
): {
  sxx: number;
  syy: number;
  sxy: number;
  mx: number;
  my: number;
  n: number;
} | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    xs.push(xv);
    ys.push(yv);
  }
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const den = n - 1;
  sxx /= den;
  syy /= den;
  sxy /= den;
  if (!(sxx > 0 && syy > 0)) return null;
  // Nearly singular cov (correlation ≈ ±1) is still OK if both vars positive.
  return { sxx, syy, sxy, mx, my, n };
}

/** Perimeter points for a bivariate normal ellipse at the given level. */
export function ellipsePerimeter(
  cov: { sxx: number; syy: number; sxy: number; mx: number; my: number },
  level: number,
  segments: number,
): { x: Float64Array; y: Float64Array } {
  const chi = qchisq2(level);
  const scale = Math.sqrt(chi);
  // Eigenvalues of [[sxx, sxy], [sxy, syy]]
  const trace = cov.sxx + cov.syy;
  const det = cov.sxx * cov.syy - cov.sxy * cov.sxy;
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;
  // Eigenvector for λ1 (primary axis)
  let e1x: number;
  let e1y: number;
  if (Math.abs(cov.sxy) > 1e-15) {
    e1x = l1 - cov.syy;
    e1y = cov.sxy;
  } else if (cov.sxx >= cov.syy) {
    e1x = 1;
    e1y = 0;
  } else {
    e1x = 0;
    e1y = 1;
  }
  const e1n = Math.hypot(e1x, e1y) || 1;
  e1x /= e1n;
  e1y /= e1n;
  // Orthogonal e2
  const e2x = -e1y;
  const e2y = e1x;
  const a = Math.sqrt(Math.max(0, l1)) * scale;
  const b = Math.sqrt(Math.max(0, l2)) * scale;

  const n = Math.max(3, Math.floor(segments));
  // n samples + closing duplicate
  const outN = n + 1;
  const xs = new Float64Array(outN);
  const ys = new Float64Array(outN);
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // R * [a cos, b sin]
    const dx = a * c * e1x + b * s * e2x;
    const dy = a * c * e1y + b * s * e2y;
    xs[i] = cov.mx + dx;
    ys[i] = cov.my + dy;
  }
  xs[n] = xs[0]!;
  ys[n] = ys[0]!;
  return { x: xs, y: ys };
}

export function statEllipse(input: StatEllipseInput): StatEllipseResult {
  const { x, y, groups, carried } = input;
  const level = input.params?.level ?? 0.95;
  const segments = input.params?.segments ?? 51;
  // type reserved for future t/euclid; only norm today.
  const type = input.params?.type ?? "norm";
  if (type !== "norm") {
    // Loud failure: unknown type is a contract bug, not silent empty.
    throw new Error(`stat_ellipse: type "${type}" is not supported in v1 (only "norm")`);
  }

  const byGroup = new Map<number, number[]>();
  let dropped = 0;
  for (let row = 0; row < x.length; row++) {
    const xv = x[row]!;
    const yv = y[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      dropped++;
      continue;
    }
    const g = groups[row] ?? 0;
    let list = byGroup.get(g);
    if (list === undefined) {
      list = [];
      byGroup.set(g, list);
    }
    list.push(row);
  }

  const outX: number[] = [];
  const outY: number[] = [];
  const outG: number[] = [];
  const carriedOut: Record<string, import("../table.js").CellValue[]> = {};
  for (const key of Object.keys(carried)) carriedOut[key] = [];

  let droppedGroups = 0;
  const groupIds = [...byGroup.keys()].toSorted((a, b) => a - b);
  for (const g of groupIds) {
    const rows = byGroup.get(g)!;
    const cov = sampleCov2(x, y, rows);
    if (cov === null) {
      droppedGroups++;
      dropped += rows.length;
      continue;
    }
    const ring = ellipsePerimeter(cov, level, segments);
    // Representative carried values: first row of the group (discrete aes).
    const rep = rows[0]!;
    for (let i = 0; i < ring.x.length; i++) {
      outX.push(ring.x[i]!);
      outY.push(ring.y[i]!);
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
    droppedGroups,
  };
}
