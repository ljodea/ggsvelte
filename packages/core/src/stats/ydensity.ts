/**
 * The ydensity stat (ggplot2 stat_ydensity clean-room) — KDE over continuous y
 * per discrete x category (and group), producing mirrored violin widths.
 *
 * Stat output contract:
 *  - required inputs: continuous y; x (category); optional group
 *  - generated: density, scaled, count, violinwidth; y is the evaluation grid
 *  - x is the categorical position (repeated per grid point)
 *  - scale: "area" | "count" | "width" (default area) controls relative max width
 *  - trim: true → cut=0 (data range); false → cut=3 (density tails)
 *  - groups with <2 finite y dropped
 *
 * Reuses {@link statDensity} KDE per (x, group) bucket.
 */
import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";

import { statDensity } from "./density.js";

export type ViolinScale = "area" | "count" | "width";

export interface YDensityParamsInput {
  bw?: number;
  adjust?: number;
  n?: number;
  trim?: boolean;
  scale?: ViolinScale;
}

export interface YDensityStatInput {
  y: Float64Array;
  x: readonly CellValue[];
  groups: readonly number[];
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: YDensityParamsInput;
}

export interface YDensityStatResult {
  x: CellValue[];
  y: Float64Array;
  density: Float64Array;
  scaled: Float64Array;
  count: Float64Array;
  violinwidth: Float64Array;
  groups: number[];
  /** Sample size per output row's violin (for diagnostics). */
  n: Float64Array;
  carried: Record<string, CellValue[]>;
  dropped: number;
  droppedGroups: number;
}

interface Bucket {
  x: CellValue;
  group: number;
  rows: number[];
}

export function statYDensity(input: YDensityStatInput): YDensityStatResult {
  const { y, x, groups } = input;
  const params = input.params ?? {};
  const scaleMode: ViolinScale = params.scale ?? "area";
  const trim = params.trim ?? true;
  const cut = trim ? 0 : 3;
  const gridN = params.n ?? 512;
  const carriedNames = Object.keys(input.carried ?? {});

  const buckets = new Map<string, Bucket>();
  const order: string[] = [];
  let dropped = 0;
  for (let i = 0; i < y.length; i++) {
    if (!Number.isFinite(y[i]!)) {
      dropped++;
      continue;
    }
    const xv = x[i] ?? null;
    const g = groups[i]!;
    const key = `${encodeKey(xv)}\0${g}`;
    let b = buckets.get(key);
    if (b === undefined) {
      b = { x: xv, group: g, rows: [] };
      buckets.set(key, b);
      order.push(key);
    }
    b.rows.push(i);
  }

  type PartialViolin = {
    x: CellValue;
    group: number;
    y: Float64Array;
    density: Float64Array;
    scaled: Float64Array;
    count: Float64Array;
    n: number;
    firstRow: number;
  };
  const violins: PartialViolin[] = [];
  let droppedGroups = 0;
  let maxN = 1;

  for (const key of order) {
    const b = buckets.get(key)!;
    if (b.rows.length < 2) {
      droppedGroups++;
      continue;
    }
    const ny = b.rows.length;
    const values = new Float64Array(ny);
    for (let j = 0; j < ny; j++) values[j] = y[b.rows[j]!]!;
    const dens = statDensity({
      x: values,
      groups: Array.from({ length: ny }, () => 0),
      params: {
        ...(params.bw !== undefined && { bw: params.bw }),
        ...(params.adjust !== undefined && { adjust: params.adjust }),
        n: gridN,
        cut,
      },
    });
    if (dens.x.length === 0) {
      droppedGroups++;
      continue;
    }
    maxN = Math.max(maxN, ny);
    violins.push({
      x: b.x,
      group: b.group,
      y: dens.x,
      density: dens.density,
      scaled: dens.scaled,
      count: dens.count,
      n: ny,
      firstRow: b.rows[0]!,
    });
  }

  const outX: CellValue[] = [];
  const outY: number[] = [];
  const outDensity: number[] = [];
  const outScaled: number[] = [];
  const outCount: number[] = [];
  const outWidth: number[] = [];
  const outN: number[] = [];
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  for (const v of violins) {
    // Relative max width factor (ggplot2-ish): width/area/count.
    let factor = 1;
    if (scaleMode === "count") factor = v.n / maxN;
    else if (scaleMode === "area") factor = Math.sqrt(v.n / maxN);
    // scale "width": factor stays 1 (equal max width)
    for (let k = 0; k < v.y.length; k++) {
      outX.push(v.x);
      outY.push(v.y[k]!);
      outDensity.push(v.density[k]!);
      outScaled.push(v.scaled[k]!);
      outCount.push(v.count[k]!);
      outWidth.push(v.scaled[k]! * factor);
      outN.push(v.n);
      outGroups.push(v.group);
      for (const name of carriedNames) {
        carried[name]!.push(input.carried![name]![v.firstRow]!);
      }
    }
  }

  return {
    x: outX,
    y: Float64Array.from(outY),
    density: Float64Array.from(outDensity),
    scaled: Float64Array.from(outScaled),
    count: Float64Array.from(outCount),
    violinwidth: Float64Array.from(outWidth),
    groups: outGroups,
    n: Float64Array.from(outN),
    carried,
    dropped,
    droppedGroups,
  };
}
