/**
 * Hexagonal 2D binning (ggplot2 stat_bin_hex / geom_hex).
 *
 * Clean-room lattice (pointy-top axial, redblobgames-style):
 *  - size chosen so ~`bins` hexes span the x range (width = √3 · size)
 *  - y uses the same size (stretched when data aspect ≠1 via separate x/y
 *    domain mapping after binning in unit space)
 *
 * Algorithm:
 *  1. Map data → unit square using data ranges.
 *  2. Bin with pointy-top axial coords at unit size s = 1 / bins.
 *  3. Emit non-empty hex centers (mapped back to data space) + counts.
 *  4. Vertex half-extents: halfWidth/halfHeight in data units for geom.
 *
 * drop defaults true (omit zero-count cells). Weights: NA → 0.
 */
import type { CellValue } from "../table.js";

interface BinHexParamsInput {
  bins?: number | undefined;
  drop?: boolean | undefined;
}

export interface BinHexStatInput {
  x: Float64Array;
  y: Float64Array;
  groups: readonly number[];
  weights?: Float64Array | null;
  carried?: Readonly<Record<string, readonly CellValue[]>>;
  params?: BinHexParamsInput;
}

export interface BinHexStatResult {
  /** Hex center x (data space). */
  x: Float64Array;
  /** Hex center y (data space). */
  y: Float64Array;
  /** Full hex width in data units (horizontal vertex span). */
  width: Float64Array;
  /** Full hex height in data units (vertical vertex span). */
  height: Float64Array;
  count: Float64Array;
  density: Float64Array;
  ncount: Float64Array;
  ndensity: Float64Array;
  groups: number[];
  carried: Record<string, CellValue[]>;
  dropped: number;
  usedDefaultBins: boolean;
}

/** Cube-round axial (q,r) — standard hex grid rounding. */
export function cubeRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  return { q: rq, r: rr };
}

/**
 * Pointy-top: unit-space (nx, ny) → axial (q, r) for hex size s (center-to-vertex).
 * x = s·√3·(q + r/2), y = s·3/2·r  ⇒ inverse below.
 */
export function pixelToAxial(nx: number, ny: number, s: number): { q: number; r: number } {
  const q = ((Math.sqrt(3) / 3) * nx - (1 / 3) * ny) / s;
  const r = ((2 / 3) * ny) / s;
  return cubeRound(q, r);
}

/** Axial → unit-space center (pointy-top). */
export function axialToPixel(q: number, r: number, s: number): { x: number; y: number } {
  return {
    x: s * Math.sqrt(3) * (q + r / 2),
    y: s * (3 / 2) * r,
  };
}

/**
 * Six pointy-top vertices around center (cx, cy) with center-to-vertex radii
 * (rx, ry) in the same space. Angles start at −30° (pointy top).
 */
export function hexVertices(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    out.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }
  return out;
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
  if (min === max) return [min - 0.5, max + 0.5];
  return [min, max];
}

/** Map key for (group slot, axial q, axial r) bins. */
function hexBinKey(gs: number, q: number, r: number): string {
  return `${gs}:${q}:${r}`;
}

export function statBinHex(input: BinHexStatInput): BinHexStatResult {
  const { x, y, groups, weights } = input;
  const params = input.params ?? {};
  const drop = params.drop !== false;
  const bins = params.bins ?? 30;
  const usedDefaultBins = params.bins === undefined;
  const carriedNames = Object.keys(input.carried ?? {});
  const nIn = Math.min(x.length, y.length);

  const empty = (dropped: number): BinHexStatResult => ({
    x: new Float64Array(0),
    y: new Float64Array(0),
    width: new Float64Array(0),
    height: new Float64Array(0),
    count: new Float64Array(0),
    density: new Float64Array(0),
    ncount: new Float64Array(0),
    ndensity: new Float64Array(0),
    groups: [],
    carried: Object.fromEntries(carriedNames.map((n) => [n, []])),
    dropped,
    usedDefaultBins,
  });

  const xRange = finiteRange(x);
  const yRange = finiteRange(y);
  if (xRange === null || yRange === null) return empty(nIn);

  const [xmin, xmax] = xRange;
  const [ymin, ymax] = yRange;
  const spanX = xmax - xmin;
  const spanY = ymax - ymin;

  // Unit size so ~`bins` hexes span unit width (hex width = √3 · s).
  const s = 1 / Math.max(1, bins * Math.sqrt(3));

  // Group first-seen order.
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

  // Key: groupSlot | q | r  → count
  const counts = new Map<string, number>();
  let dropped = 0;

  for (let i = 0; i < nIn; i++) {
    const xv = x[i]!;
    const yv = y[i]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      dropped++;
      continue;
    }
    // Normalize to unit square.
    const nx = (xv - xmin) / spanX;
    const ny = (yv - ymin) / spanY;
    const { q, r } = pixelToAxial(nx, ny, s);
    const gs = groupSlot.get(groups[i]!)!;
    const key = hexBinKey(gs, q, r);
    let w = 1;
    if (weights !== null && weights !== undefined) {
      w = Number.isFinite(weights[i]!) ? weights[i]! : 0;
    }
    counts.set(key, (counts.get(key) ?? 0) + w);
  }

  // Collect cells.
  type Cell = { gs: number; q: number; r: number; count: number };
  const cells: Cell[] = [];
  for (const [key, count] of counts) {
    if (drop && count === 0) continue;
    const [gsStr, qStr, rStr] = key.split(":");
    cells.push({
      gs: Number(gsStr),
      q: Number(qStr),
      r: Number(rStr),
      count,
    });
  }
  if (cells.length === 0) return empty(dropped);

  // Sort by group then q,r for determinism.
  cells.sort((a, b) => a.gs - b.gs || a.r - b.r || a.q - b.q);

  // Per-group totals for density.
  const groupTotal = new Map<number, number>();
  const groupMax = new Map<number, number>();
  for (const c of cells) {
    groupTotal.set(c.gs, (groupTotal.get(c.gs) ?? 0) + Math.abs(c.count));
    groupMax.set(c.gs, Math.max(groupMax.get(c.gs) ?? 0, Math.abs(c.count)));
  }

  // Hex area in unit space: (3√3/2) s² for regular pointy-top.
  const unitArea = ((3 * Math.sqrt(3)) / 2) * s * s;
  // Data-space area scale.
  const dataArea = unitArea * spanX * spanY;

  // Vertex radii in data space: unit center-to-vertex s maps to (s*spanX, s*spanY)
  // but pointy-top x extent is s*√3 (half-width), y extent is s (half-height to flat? pointy half-height = s).
  // Full width = 2 * (s * √3 / 2)? Pointy-top: width = √3 * s, height = 2 * s (in unit space).
  const unitWidth = Math.sqrt(3) * s;
  const unitHeight = 2 * s;
  const dataWidth = unitWidth * spanX;
  const dataHeight = unitHeight * spanY;

  const nOut = cells.length;
  const outX = new Float64Array(nOut);
  const outY = new Float64Array(nOut);
  const outW = new Float64Array(nOut);
  const outH = new Float64Array(nOut);
  const outCount = new Float64Array(nOut);
  const outDensity = new Float64Array(nOut);
  const outNcount = new Float64Array(nOut);
  const outNdensity = new Float64Array(nOut);
  const outGroups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  // Max density per group for ndensity.
  const groupMaxDensity = new Map<number, number>();
  for (const c of cells) {
    const total = groupTotal.get(c.gs) ?? 0;
    const d = total > 0 && dataArea > 0 ? c.count / dataArea / total : 0;
    groupMaxDensity.set(c.gs, Math.max(groupMaxDensity.get(c.gs) ?? 0, d));
  }

  for (let i = 0; i < nOut; i++) {
    const c = cells[i]!;
    const { x: ux, y: uy } = axialToPixel(c.q, c.r, s);
    outX[i] = xmin + ux * spanX;
    outY[i] = ymin + uy * spanY;
    outW[i] = dataWidth;
    outH[i] = dataHeight;
    outCount[i] = c.count;
    const total = groupTotal.get(c.gs) ?? 0;
    const d = total > 0 && dataArea > 0 ? c.count / dataArea / total : 0;
    outDensity[i] = d;
    const maxC = groupMax.get(c.gs) ?? 0;
    outNcount[i] = maxC > 0 ? c.count / maxC : 0;
    const maxD = groupMaxDensity.get(c.gs) ?? 0;
    outNdensity[i] = maxD > 0 ? d / maxD : 0;
    outGroups.push(groupOrder[c.gs]!);
    for (const name of carriedNames) {
      carried[name]!.push(input.carried![name]![sampleRow[c.gs]!]!);
    }
  }

  return {
    x: outX,
    y: outY,
    width: outW,
    height: outH,
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
