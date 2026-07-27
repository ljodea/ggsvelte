/**
 * The bin_2d stat (ggplot2's stat_bin_2d / geom_bin2d).
 *
 * Clean-room from published contracts:
 *  - required inputs: continuous x and y
 *  - generated: count, density, ncount, ndensity; xmin/xmax/ymin/ymax; x/y centers
 *  - default drop=true omits zero-count bins
 *  - weights: missing weights count as 0 (ggplot2)
 *  - missing/non-finite x or y rows dropped
 *
 * Break grids reuse 1D bin-breaks helpers (one shared bins default per axis).
 */
import type { CellValue } from "../table.js";

import { binBreaksBins, binBreaksWidth, binIndexOf } from "./bin-breaks.js";

interface Bin2dParamsInput {
  bins?: number | undefined;
  binwidth?: number | undefined;
  drop?: boolean | undefined;
}

export interface Bin2dStatInput {
  x: Float64Array;
  y: Float64Array;
  groups: readonly number[];
  weights?: Float64Array | null;
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: Bin2dParamsInput;
  /** Optional shared x range (fixed-x facets). */
  xRange?: [number, number];
  /** Optional shared y range (fixed-y facets). */
  yRange?: [number, number];
}

export interface Bin2dStatResult {
  x: Float64Array;
  y: Float64Array;
  xmin: Float64Array;
  xmax: Float64Array;
  ymin: Float64Array;
  ymax: Float64Array;
  count: Float64Array;
  density: Float64Array;
  ncount: Float64Array;
  ndensity: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  usedDefaultBins: boolean;
}

function finiteRange(values: Float64Array): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min > max) return null;
  return [min, max];
}

export function statBin2d(input: Bin2dStatInput): Bin2dStatResult {
  const { x, y, groups, weights } = input;
  const params = input.params ?? {};
  const drop = params.drop !== false;
  const carriedNames = Object.keys(input.carried ?? {});
  const usedDefaultBins = params.bins === undefined && params.binwidth === undefined;
  const nIn = Math.min(x.length, y.length);

  const empty = (dropped: number): Bin2dStatResult => ({
    x: new Float64Array(0),
    y: new Float64Array(0),
    xmin: new Float64Array(0),
    xmax: new Float64Array(0),
    ymin: new Float64Array(0),
    ymax: new Float64Array(0),
    count: new Float64Array(0),
    density: new Float64Array(0),
    ncount: new Float64Array(0),
    ndensity: new Float64Array(0),
    groups: [],
    carried: Object.fromEntries(carriedNames.map((n) => [n, []])),
    dropped,
    usedDefaultBins,
  });

  const dataXRange = finiteRange(x);
  const dataYRange = finiteRange(y);
  if (dataXRange === null || dataYRange === null) return empty(nIn);

  const closed = "right" as const;
  const xRange = input.xRange ?? dataXRange;
  const yRange = input.yRange ?? dataYRange;
  const bins = params.bins ?? 30;
  const xBreaks =
    params.binwidth === undefined
      ? binBreaksBins(xRange, bins, undefined, undefined, closed)
      : binBreaksWidth(xRange, params.binwidth, undefined, undefined, closed);
  const yBreaks =
    params.binwidth === undefined
      ? binBreaksBins(yRange, bins, undefined, undefined, closed)
      : binBreaksWidth(yRange, params.binwidth, undefined, undefined, closed);
  const nx = xBreaks.breaks.length - 1;
  const ny = yBreaks.breaks.length - 1;
  if (nx <= 0 || ny <= 0) return empty(nIn);

  const groupOrder: number[] = [];
  const groupSlot = new Map<number, number>();
  const sampleRow: number[] = [];
  for (let i = 0; i < nIn; i++) {
    const g = groups[i]!;
    if (!groupSlot.has(g)) {
      groupSlot.set(g, groupOrder.length);
      groupOrder.push(g);
      sampleRow.push(i);
    }
  }
  const gCount = groupOrder.length;
  const cellCount = nx * ny;
  const counts = new Float64Array(gCount * cellCount);
  let dropped = 0;
  for (let i = 0; i < nIn; i++) {
    const xv = x[i]!;
    const yv = y[i]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      dropped++;
      continue;
    }
    const ix = binIndexOf(xv, xBreaks.fuzzy, xBreaks.rightClosed);
    const iy = binIndexOf(yv, yBreaks.fuzzy, yBreaks.rightClosed);
    if (ix === -1 || iy === -1) {
      dropped++;
      continue;
    }
    let w = 1;
    if (weights !== null && weights !== undefined) {
      w = Number.isFinite(weights[i]!) ? weights[i]! : 0;
    }
    const slot = groupSlot.get(groups[i]!)! * cellCount + iy * nx + ix;
    counts[slot] = counts[slot]! + w;
  }

  // First pass: how many output rows?
  let nOut = 0;
  for (let s = 0; s < gCount; s++) {
    for (let c = 0; c < cellCount; c++) {
      const cnt = counts[s * cellCount + c]!;
      if (!drop || cnt !== 0) nOut++;
    }
  }
  if (nOut === 0) return empty(dropped);

  const outX = new Float64Array(nOut);
  const outY = new Float64Array(nOut);
  const outXmin = new Float64Array(nOut);
  const outXmax = new Float64Array(nOut);
  const outYmin = new Float64Array(nOut);
  const outYmax = new Float64Array(nOut);
  const outCount = new Float64Array(nOut);
  const outDensity = new Float64Array(nOut);
  const outNcount = new Float64Array(nOut);
  const outNdensity = new Float64Array(nOut);
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  let row = 0;
  for (let s = 0; s < gCount; s++) {
    let total = 0;
    let maxCount = 0;
    for (let c = 0; c < cellCount; c++) {
      const cnt = counts[s * cellCount + c]!;
      total += Math.abs(cnt);
      if (Math.abs(cnt) > maxCount) maxCount = Math.abs(cnt);
    }
    let maxDensity = 0;
    for (let iy = 0; iy < ny; iy++) {
      const yLo = yBreaks.breaks[iy]!;
      const yHi = yBreaks.breaks[iy + 1]!;
      const wy = yHi - yLo;
      for (let ix = 0; ix < nx; ix++) {
        const xLo = xBreaks.breaks[ix]!;
        const xHi = xBreaks.breaks[ix + 1]!;
        const wx = xHi - xLo;
        const area = wx * wy;
        const cnt = counts[s * cellCount + iy * nx + ix]!;
        const d = total > 0 && area > 0 ? cnt / area / total : 0;
        if (d > maxDensity) maxDensity = d;
      }
    }
    for (let iy = 0; iy < ny; iy++) {
      const yLo = yBreaks.breaks[iy]!;
      const yHi = yBreaks.breaks[iy + 1]!;
      const wy = yHi - yLo;
      for (let ix = 0; ix < nx; ix++) {
        const xLo = xBreaks.breaks[ix]!;
        const xHi = xBreaks.breaks[ix + 1]!;
        const wx = xHi - xLo;
        const cnt = counts[s * cellCount + iy * nx + ix]!;
        if (drop && cnt === 0) continue;
        const area = wx * wy;
        const d = total > 0 && area > 0 ? cnt / area / total : 0;
        outX[row] = (xLo + xHi) / 2;
        outY[row] = (yLo + yHi) / 2;
        outXmin[row] = xLo;
        outXmax[row] = xHi;
        outYmin[row] = yLo;
        outYmax[row] = yHi;
        outCount[row] = cnt;
        outDensity[row] = d;
        outNcount[row] = maxCount > 0 ? cnt / maxCount : 0;
        outNdensity[row] = maxDensity > 0 ? d / maxDensity : 0;
        outGroups.push(groupOrder[s]!);
        for (const name of carriedNames) {
          carried[name]!.push(input.carried![name]![sampleRow[s]!]!);
        }
        row++;
      }
    }
  }

  return {
    x: outX,
    y: outY,
    xmin: outXmin,
    xmax: outXmax,
    ymin: outYmin,
    ymax: outYmax,
    count: outCount,
    density: outDensity,
    ncount: outNcount,
    ndensity: outNdensity,
    groups: outGroups,
    carried,
    dropped,
    usedDefaultBins,
  };
}
