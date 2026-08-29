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
 *  3. Emit hex centers (mapped back to data space) + counts.
 *  4. Vertex half-extents: halfWidth/halfHeight in data units for geom.
 *
 * drop defaults true (omit zero-count cells). When false, every lattice cell
 * whose centre is inside the unit square (for each group) is emitted with
 * count 0 when empty — ggplot2 stat_bin_hex(drop = FALSE). Weights: NA → 0.
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

/**
 * Axis range over rows where *both* x and y are finite — matches the binning
 * drop predicate so incomplete pairs cannot stretch the unit-square lattice.
 */
function finitePairRanges(
  x: Float64Array,
  y: Float64Array,
): { x: [number, number]; y: [number, number] } | null {
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const xv = x[i]!;
    const yv = y[i]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
    if (xv < xmin) xmin = xv;
    if (xv > xmax) xmax = xv;
    if (yv < ymin) ymin = yv;
    if (yv > ymax) ymax = yv;
  }
  if (xmin > xmax || ymin > ymax) return null;
  if (xmin === xmax) {
    xmin -= 0.5;
    xmax += 0.5;
  }
  if (ymin === ymax) {
    ymin -= 0.5;
    ymax += 0.5;
  }
  return { x: [xmin, xmax], y: [ymin, ymax] };
}

/** Map key for (group slot, axial q, axial r) bins. */
function hexBinKey(gs: number, q: number, r: number): string {
  return `${gs}:${q}:${r}`;
}

/** Occupied (or lattice-filled) hex cell with coords stored at insert time. */
type HexCell = { gs: number; q: number; r: number; count: number };

/**
 * Materialize zero-count axial cells whose centres sit in a one-hex pad of the
 * unit square, for every group slot. Extracted so `statBinHex` stays under the
 * max nesting depth for type-aware lint.
 */
function fillEmptyLatticeCells(counts: Map<string, HexCell>, groupCount: number, s: number): void {
  const pad = Math.max(Math.sqrt(3) * s, 2 * s);
  const sampleCorners: Array<readonly [number, number]> = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [0.5, 0],
    [0.5, 1],
    [0, 0.5],
    [1, 0.5],
  ];
  let minQ = Infinity;
  let maxQ = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (const [nx, ny] of sampleCorners) {
    const axial = pixelToAxial(nx, ny, s);
    if (axial.q < minQ) minQ = axial.q;
    if (axial.q > maxQ) maxQ = axial.q;
    if (axial.r < minR) minR = axial.r;
    if (axial.r > maxR) maxR = axial.r;
  }
  // Expand so edge hexes whose centres sit just outside the corners still
  // enter the candidate box before the pad filter.
  minQ -= 2;
  maxQ += 2;
  minR -= 2;
  maxR += 2;
  for (let gs = 0; gs < groupCount; gs++) {
    for (let r = minR; r <= maxR; r++) {
      for (let q = minQ; q <= maxQ; q++) {
        const { x: ux, y: uy } = axialToPixel(q, r, s);
        if (ux < -pad || ux > 1 + pad || uy < -pad || uy > 1 + pad) continue;
        const key = hexBinKey(gs, q, r);
        if (!counts.has(key)) counts.set(key, { gs, q, r, count: 0 });
      }
    }
  }
}

function indexGroups(input: BinHexStatInput, rowCount: number) {
  const order: number[] = [];
  const slots = new Map<number, number>();
  const sampleRows: number[] = [];
  for (let i = 0; i < rowCount; i++) {
    const group = input.groups[i]!;
    if (slots.has(group)) continue;
    slots.set(group, order.length);
    order.push(group);
    sampleRows.push(i);
  }
  return { order, slots, sampleRows };
}

function collectCells(
  input: BinHexStatInput,
  rowCount: number,
  ranges: { x: [number, number]; y: [number, number] },
  size: number,
  groupSlots: Map<number, number>,
) {
  const counts = new Map<string, HexCell>();
  const spanX = ranges.x[1] - ranges.x[0];
  const spanY = ranges.y[1] - ranges.y[0];
  let dropped = 0;
  for (let i = 0; i < rowCount; i++) {
    const x = input.x[i]!;
    const y = input.y[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      dropped++;
      continue;
    }
    const axial = pixelToAxial((x - ranges.x[0]) / spanX, (y - ranges.y[0]) / spanY, size);
    const group = groupSlots.get(input.groups[i]!)!;
    const key = hexBinKey(group, axial.q, axial.r);
    const rawWeight = input.weights?.[i];
    const weight = rawWeight === undefined ? 1 : Number.isFinite(rawWeight) ? rawWeight : 0;
    const existing = counts.get(key);
    if (existing === undefined) counts.set(key, { gs: group, ...axial, count: weight });
    else existing.count += weight;
  }
  return { counts, dropped };
}

function selectedCells(counts: Map<string, HexCell>, drop: boolean): HexCell[] {
  const cells: HexCell[] = [];
  for (const cell of counts.values()) {
    if (!drop || cell.count !== 0) cells.push(cell);
  }
  cells.sort((a, b) => a.gs - b.gs || a.r - b.r || a.q - b.q);
  return cells;
}

function groupMetrics(cells: HexCell[], dataArea: number) {
  const totals = new Map<number, number>();
  const maxCounts = new Map<number, number>();
  for (const cell of cells) {
    totals.set(cell.gs, (totals.get(cell.gs) ?? 0) + Math.abs(cell.count));
    maxCounts.set(cell.gs, Math.max(maxCounts.get(cell.gs) ?? 0, Math.abs(cell.count)));
  }
  const maxDensities = new Map<number, number>();
  for (const cell of cells) {
    const total = totals.get(cell.gs) ?? 0;
    const density = total > 0 && dataArea > 0 ? cell.count / dataArea / total : 0;
    maxDensities.set(cell.gs, Math.max(maxDensities.get(cell.gs) ?? 0, density));
  }
  return { totals, maxCounts, maxDensities };
}

function normalized(value: number, max: number): number {
  return max > 0 ? value / max : 0;
}

function emitCells(
  input: BinHexStatInput,
  cells: HexCell[],
  groupOrder: number[],
  sampleRows: number[],
  carriedNames: string[],
  geometry: {
    xmin: number;
    ymin: number;
    spanX: number;
    spanY: number;
    size: number;
  },
) {
  const unitArea = ((3 * Math.sqrt(3)) / 2) * geometry.size * geometry.size;
  const dataArea = unitArea * geometry.spanX * geometry.spanY;
  const width = Math.sqrt(3) * geometry.size * geometry.spanX;
  const height = 2 * geometry.size * geometry.spanY;
  const metrics = groupMetrics(cells, dataArea);
  const x = new Float64Array(cells.length);
  const y = new Float64Array(cells.length);
  const widths = new Float64Array(cells.length);
  const heights = new Float64Array(cells.length);
  const count = new Float64Array(cells.length);
  const density = new Float64Array(cells.length);
  const ncount = new Float64Array(cells.length);
  const ndensity = new Float64Array(cells.length);
  const groups: number[] = [];
  const carried: Record<string, CellValue[]> = {};
  for (const name of carriedNames) carried[name] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const unit = axialToPixel(cell.q, cell.r, geometry.size);
    x[i] = geometry.xmin + unit.x * geometry.spanX;
    y[i] = geometry.ymin + unit.y * geometry.spanY;
    widths[i] = width;
    heights[i] = height;
    count[i] = cell.count;
    const total = metrics.totals.get(cell.gs) ?? 0;
    const cellDensity = total > 0 && dataArea > 0 ? cell.count / dataArea / total : 0;
    density[i] = cellDensity;
    ncount[i] = normalized(cell.count, metrics.maxCounts.get(cell.gs) ?? 0);
    ndensity[i] = normalized(cellDensity, metrics.maxDensities.get(cell.gs) ?? 0);
    groups.push(groupOrder[cell.gs]!);
    for (const name of carriedNames) {
      carried[name]!.push(input.carried![name]![sampleRows[cell.gs]!]!);
    }
  }
  return {
    x,
    y,
    widths,
    heights,
    count,
    density,
    ncount,
    ndensity,
    groups,
    carried,
  };
}

export function statBinHex(input: BinHexStatInput): BinHexStatResult {
  const { x, y } = input;
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

  const ranges = finitePairRanges(x, y);
  if (ranges === null) return empty(nIn);

  const [xmin, xmax] = ranges.x;
  const [ymin, ymax] = ranges.y;
  const spanX = xmax - xmin;
  const spanY = ymax - ymin;

  // Unit size so ~`bins` hexes span unit width (hex width = √3 · s).
  const s = 1 / Math.max(1, bins * Math.sqrt(3));

  // Group first-seen order.
  const { order: groupOrder, slots: groupSlot, sampleRows: sampleRow } = indexGroups(input, nIn);

  // Key: groupSlot | q | r  → cell (coords stored at insert so collect never
  // re-parses the composite string key).
  const { counts, dropped } = collectCells(input, nIn, ranges, s, groupSlot);

  // drop:false — materialize the full axial lattice over the unit square so
  // empty cells appear (counts Map only ever saw occupied keys). Bound by
  // centres inside a one-hex pad of [0,1]² so bins cannot explode unbounded.
  if (!drop && groupOrder.length > 0) {
    fillEmptyLatticeCells(counts, groupOrder.length, s);
  }

  // Collect cells (coords already known — no key.split / Number re-parse).
  const cells = selectedCells(counts, drop);
  if (cells.length === 0) return empty(dropped);
  const output = emitCells(input, cells, groupOrder, sampleRow, carriedNames, {
    xmin,
    ymin,
    spanX,
    spanY,
    size: s,
  });

  return {
    x: output.x,
    y: output.y,
    width: output.widths,
    height: output.heights,
    count: output.count,
    density: output.density,
    ncount: output.ncount,
    ndensity: output.ndensity,
    groups: output.groups,
    carried: output.carried,
    dropped,
    usedDefaultBins,
  };
}
