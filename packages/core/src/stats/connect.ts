/**
 * stat_connect — expand successive points into connection vertices (#816).
 * Clean-room contract against ggplot2 public docs for stat_connect
 * (named connections only; custom matrix deferred).
 *
 * Between consecutive finite points A→B within a group:
 * - linear: B
 * - hv: (Bx, Ay), B
 * - vh: (Ax, By), B
 * - mid: ((Ax+Bx)/2, Ay), ((Ax+Bx)/2, By), B
 *
 * First point of each group is always emitted. Non-finite rows are dropped
 * and remaining successive finite points reconnect (documented subset).
 * Operates on mapped numeric position space (after positionColumn transforms).
 */

import type { CellValue } from "../table.js";

export type ConnectConnection = "hv" | "vh" | "mid" | "linear";

export interface StatConnectInput {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: readonly number[];
  /** Named connection shape; default "hv". */
  readonly connection?: ConnectConnection;
  /** When true, sort each group by x before expansion (line geom). */
  readonly sortByX?: boolean;
  readonly carried: Readonly<Record<string, readonly CellValue[]>>;
}

export interface StatConnectResult {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly groups: number[];
  readonly carried: Record<string, CellValue[]>;
  readonly dropped: number;
}

export interface ConnectVertex {
  readonly x: number;
  readonly y: number;
}

/** Expand A→B into vertices including B (not A). */
export function expandSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  connection: ConnectConnection,
): ConnectVertex[] {
  switch (connection) {
    case "linear":
      return [{ x: bx, y: by }];
    case "hv":
      return [
        { x: bx, y: ay },
        { x: bx, y: by },
      ];
    case "vh":
      return [
        { x: ax, y: by },
        { x: bx, y: by },
      ];
    case "mid": {
      const mx = (ax + bx) / 2;
      return [
        { x: mx, y: ay },
        { x: mx, y: by },
        { x: bx, y: by },
      ];
    }
    default: {
      // Exhaustiveness for ConnectConnection.
      throw new Error(`unknown connection mode: ${String(connection satisfies never)}`);
    }
  }
}

export function statConnect(input: StatConnectInput): StatConnectResult {
  const connection = input.connection ?? "hv";
  const sortByX = input.sortByX === true;
  const { x, y, groups, carried } = input;

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
  const carriedOut: Record<string, CellValue[]> = {};
  const carriedKeys = Object.keys(carried);
  for (const key of carriedKeys) carriedOut[key] = [];

  // Preserve first-seen group order (stable with input traversal).
  for (const g of byGroup.keys()) {
    const rows = byGroup.get(g)!;
    if (sortByX) {
      rows.sort((a, b) => {
        const dx = x[a]! - x[b]!;
        return dx === 0 ? a - b : dx;
      });
    }
    if (rows.length === 0) continue;

    const pushCarried = (sourceRow: number) => {
      for (const key of carriedKeys) {
        carriedOut[key]!.push(carried[key]![sourceRow]!);
      }
    };

    const first = rows[0]!;
    outX.push(x[first]!);
    outY.push(y[first]!);
    outG.push(g);
    pushCarried(first);

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1]!;
      const cur = rows[i]!;
      const ax = x[prev]!;
      const ay = y[prev]!;
      const bx = x[cur]!;
      const by = y[cur]!;
      const verts = expandSegment(ax, ay, bx, by, connection);
      for (let v = 0; v < verts.length; v++) {
        const vert = verts[v]!;
        outX.push(vert.x);
        outY.push(vert.y);
        outG.push(g);
        // Intermediates (not the final B) carry from A; final B from B.
        const isLast = v === verts.length - 1;
        pushCarried(isLast ? cur : prev);
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
