import { StaticQuadtree } from "./dom/quadtree.js";
import type { LineageRef } from "./identity.js";
import type { GeometryBatch, Scene } from "./scene.js";
import type { CellValue } from "./table.js";

const NO_ROW = 0xffffffff;
export type CandidateInspectMode = "auto" | "exact" | "x" | "y" | "xy";
export type ResolvedCandidateInspectMode = Exclude<CandidateInspectMode, "auto">;
export type TraversalDirection =
  | "next"
  | "previous"
  | "first"
  | "last"
  | "left"
  | "right"
  | "up"
  | "down";
export type CanonicalAxisToken =
  | Readonly<{ kind: "number"; value: number }>
  | Readonly<{ kind: "string"; value: string }>
  | Readonly<{ kind: "boolean"; value: boolean }>;

export function canonicalAxisToken(value: CellValue): CanonicalAxisToken | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? { kind: "number", value: time } : null;
  }
  if (typeof value === "number")
    return Number.isFinite(value)
      ? { kind: "number", value: Object.is(value, -0) ? 0 : value }
      : null;
  if (typeof value === "string") return { kind: "string", value };
  if (typeof value === "boolean") return { kind: "boolean", value };
  return null;
}

function tokenKey(token: CanonicalAxisToken): string {
  if (token.kind === "number") return `n:${token.value}`;
  if (token.kind === "string") return `s:${token.value.length}:${token.value}`;
  return token.value ? "b:1" : "b:0";
}

function compareTokens(a: CanonicalAxisToken, b: CanonicalAxisToken): number {
  const rank = { number: 0, string: 1, boolean: 2 } as const;
  const kind = rank[a.kind] - rank[b.kind];
  if (kind !== 0) return kind;
  if (a.kind === "number" && b.kind === "number") return a.value - b.value;
  if (a.kind === "string" && b.kind === "string")
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  if (a.kind === "boolean" && b.kind === "boolean") return Number(a.value) - Number(b.value);
  return 0;
}

export interface CandidateDatum {
  readonly xValue?: CellValue;
  readonly yValue?: CellValue;
  readonly seriesId?: number;
  readonly seriesRank?: number;
  readonly sourceOrder?: number;
  readonly lineage?: LineageRef;
  /** Semantic policy used when nearest() is requested with mode "auto". */
  readonly autoMode?: ResolvedCandidateInspectMode;
}
export interface CandidateBuildFacts {
  readonly candidateIndex: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
  readonly layerIndex: number;
  readonly panelIndex: number;
  readonly rowIndex: number | null;
  readonly kind: GeometryBatch["kind"];
  /** Candidate anchor in plot pixels. */
  readonly x: number;
  readonly y: number;
}
export interface CandidateStoreOptions {
  readonly epoch?: number;
  /** coord_flip maps semantic x to screen y and semantic y to screen x. */
  readonly flip?: boolean;
  readonly datum?: (facts: CandidateBuildFacts) => CandidateDatum | undefined;
}
export interface CandidateFacts extends CandidateBuildFacts {
  readonly id: number;
  readonly epoch: number;
  readonly panelId: string;
  readonly x: number;
  readonly y: number;
  readonly xValue: CellValue;
  readonly yValue: CellValue;
  readonly xToken: CanonicalAxisToken | null;
  readonly yToken: CanonicalAxisToken | null;
  readonly seriesId: number;
  readonly seriesRank: number;
  readonly sourceOrder: number;
  readonly lineage: LineageRef;
  readonly autoMode: ResolvedCandidateInspectMode;
}
export interface CandidateMatch extends CandidateFacts {
  readonly distance: number;
  readonly mode: ResolvedCandidateInspectMode;
}
export interface CandidateRange {
  readonly axis: "x" | "y";
  readonly panelIndex: number;
  readonly start: number;
  readonly end: number;
  readonly permutation: Uint32Array;
}
export interface CandidateGroup {
  readonly axis: "x" | "y";
  readonly axisValue: CellValue;
  readonly token: CanonicalAxisToken;
  readonly focusId: number;
  readonly memberIds: Uint32Array;
  readonly range: CandidateRange;
}
export interface CandidateStore {
  readonly epoch: number;
  readonly size: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  candidate(id: number): CandidateFacts | null;
  nearest(
    x: number,
    y: number,
    options: { mode: CandidateInspectMode; maxDistance: number; panelId?: string },
  ): CandidateMatch | null;
  group(seedId: number, axis: "x" | "y"): CandidateGroup | null;
  traverse(startId: number | null, direction?: TraversalDirection): number | null;
  cycle(seedId: number, step?: number): number | null;
  queryRect(x0: number, y0: number, x1: number, y1: number, panelId?: string): Uint32Array;
  /** Release epoch-local resolvers, scene references, and compact arrays. */
  dispose(): void;
}

const EMPTY_FLOAT32 = new Float32Array(0);
const EMPTY_UINT32 = new Uint32Array(0);

function primitiveCount(batch: GeometryBatch): number {
  if (batch.kind === "rects") return batch.rects.length / 4;
  if (batch.kind === "segments") return batch.segments.length / 4;
  return batch.positions.length / 2;
}

function localAnchor(batch: GeometryBatch, i: number): readonly [number, number] {
  if (batch.kind === "rects")
    return [batch.rects[i * 4]! + batch.rects[i * 4 + 2]! / 2, batch.rects[i * 4 + 1]!];
  if (batch.kind === "segments")
    return [
      (batch.segments[i * 4]! + batch.segments[i * 4 + 2]!) / 2,
      (batch.segments[i * 4 + 1]! + batch.segments[i * 4 + 3]!) / 2,
    ];
  return [batch.positions[i * 2]!, batch.positions[i * 2 + 1]!];
}

function defaultAutoMode(batch: GeometryBatch, i: number): ResolvedCandidateInspectMode {
  if (batch.kind === "rects") return "exact";
  if (batch.kind === "paths") return "x";
  if (batch.kind === "segments") {
    const dx = Math.abs(batch.segments[i * 4 + 2]! - batch.segments[i * 4]!);
    const dy = Math.abs(batch.segments[i * 4 + 3]! - batch.segments[i * 4 + 1]!);
    return dx <= dy ? "x" : "y";
  }
  return "xy";
}

const AUTO_MODE_CODE = { exact: 0, x: 1, y: 2, xy: 3 } as const;
const AUTO_MODES = [
  "exact",
  "x",
  "y",
  "xy",
] as const satisfies readonly ResolvedCandidateInspectMode[];

function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1,
    dy = y2 - y1,
    length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length2));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}

function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
): boolean {
  let enter = 0;
  let exit = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (const [p, q] of [
    [-dx, x1 - loX],
    [dx, hiX - x1],
    [-dy, y1 - loY],
    [dy, hiY - y1],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) enter = Math.max(enter, ratio);
    else exit = Math.min(exit, ratio);
    if (enter > exit) return false;
  }
  return true;
}

function samePath(batch: GeometryBatch, a: number, b: number): boolean {
  if (batch.kind !== "paths") return false;
  for (let p = 0; p < batch.pathOffsets.length - 1; p++)
    if (a >= batch.pathOffsets[p]! && a < batch.pathOffsets[p + 1]!)
      return b >= batch.pathOffsets[p]! && b < batch.pathOffsets[p + 1]!;
  return false;
}

function pathRange(batch: Extract<GeometryBatch, { kind: "paths" }>, vertex: number) {
  for (let p = 0; p < batch.pathOffsets.length - 1; p++) {
    const start = batch.pathOffsets[p]!;
    const end = batch.pathOffsets[p + 1]!;
    if (vertex >= start && vertex < end) return [start, end] as const;
  }
  return null;
}

function insidePath(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  start: number,
  end: number,
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (let i = start, j = end - 1; i < end; j = i++) {
    const xi = batch.positions[i * 2]!;
    const yi = batch.positions[i * 2 + 1]!;
    const xj = batch.positions[j * 2]!;
    const yj = batch.positions[j * 2 + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Shared compact candidate storage. Anchors and integer metadata are retained
 * in typed arrays; rich CandidateFacts objects are materialized only on demand.
 */
export function buildCandidateStore(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStore {
  return new LazyCandidateStore(scene, options);
}

class LazyCandidateStore implements CandidateStore {
  readonly epoch: number;
  #size: number;
  #scene: Scene | null;
  #options: CandidateStoreOptions | null;
  #initialized: CandidateStore | null = null;

  constructor(scene: Scene, options: CandidateStoreOptions) {
    this.#scene = scene;
    this.#options = options;
    this.epoch = options.epoch ?? 0;
    let size = 0;
    for (const batch of scene.batches) {
      if (scene.panels[batch.panelIndex] !== undefined) size += primitiveCount(batch);
    }
    this.#size = size;
  }

  get size(): number {
    return this.#size;
  }

  #ready(): CandidateStore | null {
    if (this.#scene === null || this.#options === null) return null;
    this.#initialized ??= buildCandidateStoreEager(this.#scene, this.#options);
    return this.#initialized;
  }

  get x(): Float32Array {
    return this.#ready()?.x ?? EMPTY_FLOAT32;
  }

  get y(): Float32Array {
    return this.#ready()?.y ?? EMPTY_FLOAT32;
  }

  candidate(id: number): CandidateFacts | null {
    return this.#ready()?.candidate(id) ?? null;
  }

  nearest(
    x: number,
    y: number,
    options: { mode: CandidateInspectMode; maxDistance: number; panelId?: string },
  ): CandidateMatch | null {
    return this.#ready()?.nearest(x, y, options) ?? null;
  }

  group(seedId: number, axis: "x" | "y"): CandidateGroup | null {
    return this.#ready()?.group(seedId, axis) ?? null;
  }

  traverse(startId: number | null, direction?: TraversalDirection): number | null {
    return this.#ready()?.traverse(startId, direction) ?? null;
  }

  cycle(seedId: number, step?: number): number | null {
    return this.#ready()?.cycle(seedId, step) ?? null;
  }

  queryRect(x0: number, y0: number, x1: number, y1: number, panelId?: string): Uint32Array {
    return this.#ready()?.queryRect(x0, y0, x1, y1, panelId) ?? EMPTY_UINT32;
  }

  dispose(): void {
    this.#initialized?.dispose();
    this.#initialized = null;
    this.#scene = null;
    this.#options = null;
    this.#size = 0;
  }
}

function buildCandidateStoreEager(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStore {
  const epoch = options.epoch ?? 0;
  const flip = options.flip ?? false;
  const batchList: number[] = [];
  const primitiveList: number[] = [];
  const panelList: number[] = [];
  const rowList: number[] = [];
  const seriesList: number[] = [];
  const rankList: number[] = [];
  const sourceList: number[] = [];
  const lineageList: number[] = [];
  const autoModeList: number[] = [];
  const xList: number[] = [];
  const yList: number[] = [];
  const xTokenList: number[] = [];
  const yTokenList: number[] = [];
  const xDateList: number[] = [];
  const yDateList: number[] = [];
  const invalidX = new Map<number, CellValue>();
  const invalidY = new Map<number, CellValue>();
  const tokens: CanonicalAxisToken[] = [];
  const tokenIndex = new Map<string, number>();
  const remember = (value: CellValue): number => {
    const token = canonicalAxisToken(value);
    if (token === null) return -1;
    const key = tokenKey(token);
    const prior = tokenIndex.get(key);
    if (prior !== undefined) return prior;
    const id = tokens.length;
    tokens.push(token);
    tokenIndex.set(key, id);
    return id;
  };

  for (let batchIndex = 0; batchIndex < scene.batches.length; batchIndex++) {
    const batch = scene.batches[batchIndex]!;
    const panel = scene.panels[batch.panelIndex];
    if (panel === undefined) continue;
    for (let primitiveIndex = 0; primitiveIndex < primitiveCount(batch); primitiveIndex++) {
      const candidateIndex = batchList.length;
      const raw = batch.rowIndex[primitiveIndex] ?? NO_ROW;
      const rowIndex = raw === NO_ROW ? null : raw;
      const [lx, ly] = localAnchor(batch, primitiveIndex);
      const buildFacts: CandidateBuildFacts = {
        candidateIndex,
        batchIndex,
        primitiveIndex,
        layerIndex: batch.layerIndex,
        panelIndex: batch.panelIndex,
        rowIndex,
        kind: batch.kind,
        x: panel.x + lx,
        y: panel.y + ly,
      };
      const datum = options.datum?.(buildFacts) ?? {};
      const xValue = datum.xValue ?? null;
      const yValue = datum.yValue ?? null;
      batchList.push(batchIndex);
      primitiveList.push(primitiveIndex);
      panelList.push(batch.panelIndex);
      rowList.push(rowIndex ?? NO_ROW);
      xList.push(panel.x + lx);
      yList.push(panel.y + ly);
      const xToken = remember(xValue);
      const yToken = remember(yValue);
      xTokenList.push(xToken);
      yTokenList.push(yToken);
      xDateList.push(xValue instanceof Date ? 1 : 0);
      yDateList.push(yValue instanceof Date ? 1 : 0);
      if (xToken === -1 && xValue !== null) invalidX.set(candidateIndex, xValue);
      if (yToken === -1 && yValue !== null) invalidY.set(candidateIndex, yValue);
      const series = datum.seriesId ?? 0;
      seriesList.push(series);
      rankList.push(datum.seriesRank ?? series);
      sourceList.push(datum.sourceOrder ?? rowIndex ?? primitiveIndex);
      lineageList.push(datum.lineage ?? 0);
      autoModeList.push(AUTO_MODE_CODE[datum.autoMode ?? defaultAutoMode(batch, primitiveIndex)]);
    }
  }

  const n = batchList.length;
  const batchIds = Uint32Array.from(batchList);
  const primitiveIds = Uint32Array.from(primitiveList);
  const panelIds = Uint32Array.from(panelList);
  const rows = Uint32Array.from(rowList);
  const series = Uint32Array.from(seriesList);
  const ranks = Uint32Array.from(rankList);
  const sources = Uint32Array.from(sourceList);
  const lineages = Uint32Array.from(lineageList);
  const autoModes = Uint8Array.from(autoModeList);
  const xs = Float32Array.from(xList);
  const ys = Float32Array.from(yList);
  const xTokenIds = Int32Array.from(xTokenList);
  const yTokenIds = Int32Array.from(yTokenList);
  const xDates = Uint8Array.from(xDateList);
  const yDates = Uint8Array.from(yDateList);

  const logicalValue = (id: number, axis: "x" | "y"): CellValue => {
    const ids = axis === "x" ? xTokenIds : yTokenIds;
    const tokenId = ids[id]!;
    if (tokenId === -1) return (axis === "x" ? invalidX : invalidY).get(id) ?? null;
    const token = tokens[tokenId]!;
    if ((axis === "x" ? xDates : yDates)[id] === 1 && token.kind === "number")
      return new Date(token.value);
    return token.value;
  };

  const fact = (id: number): CandidateFacts | null => {
    if (!Number.isInteger(id) || id < 0 || id >= n) return null;
    const batchIndex = batchIds[id]!;
    const batch = scene.batches[batchIndex]!;
    const panelIndex = panelIds[id]!;
    const raw = rows[id]!;
    return {
      candidateIndex: id,
      id,
      epoch,
      batchIndex,
      primitiveIndex: primitiveIds[id]!,
      layerIndex: batch.layerIndex,
      panelIndex,
      panelId: scene.panels[panelIndex]!.id,
      rowIndex: raw === NO_ROW ? null : raw,
      kind: batch.kind,
      x: xs[id]!,
      y: ys[id]!,
      xValue: logicalValue(id, "x"),
      yValue: logicalValue(id, "y"),
      xToken: xTokenIds[id] === -1 ? null : tokens[xTokenIds[id]!]!,
      yToken: yTokenIds[id] === -1 ? null : tokens[yTokenIds[id]!]!,
      seriesId: series[id]!,
      seriesRank: ranks[id]!,
      sourceOrder: sources[id]!,
      lineage: lineages[id]!,
      autoMode: AUTO_MODES[autoModes[id]!]!,
    };
  };

  const order = Array.from({ length: n }, (_, id) => id);
  const traversal = Uint32Array.from(
    order.toSorted(
      (a, b) =>
        panelIds[a]! - panelIds[b]! ||
        ys[a]! - ys[b]! ||
        xs[a]! - xs[b]! ||
        batchIds[a]! - batchIds[b]! ||
        primitiveIds[a]! - primitiveIds[b]!,
    ),
  );
  // Dense inverse of `traversal`: candidate id → sequential rank (O(1) next/previous).
  const traversalRank = new Uint32Array(n);
  for (let i = 0; i < n; i++) traversalRank[traversal[i]!] = i;
  const permutations: Record<"x" | "y", Uint32Array> = {
    x: new Uint32Array(0),
    y: new Uint32Array(0),
  };
  type SeriesBoundary = Readonly<{
    start: number;
    end: number;
    layerIndex: number;
    seriesId: number;
  }>;
  type BucketBoundary = Readonly<{
    start: number;
    end: number;
    series: readonly SeriesBoundary[];
  }>;
  const buckets: Record<"x" | "y", Map<string, BucketBoundary>> = {
    x: new Map<string, BucketBoundary>(),
    y: new Map<string, BucketBoundary>(),
  };
  for (const axis of ["x", "y"] as const) {
    const keys = axis === "x" ? xTokenIds : yTokenIds,
      orth = axis === "x" ? (flip ? xs : ys) : flip ? ys : xs;
    const valid = order.filter((id) => keys[id] !== -1);
    valid.sort(
      (a, b) =>
        panelIds[a]! - panelIds[b]! ||
        compareTokens(tokens[keys[a]!]!, tokens[keys[b]!]!) ||
        ranks[a]! - ranks[b]! ||
        scene.batches[batchIds[a]!]!.layerIndex - scene.batches[batchIds[b]!]!.layerIndex ||
        series[a]! - series[b]! ||
        orth[a]! - orth[b]! ||
        batchIds[a]! - batchIds[b]! ||
        sources[a]! - sources[b]!,
    );
    const permutation = Uint32Array.from(valid);
    permutations[axis] = permutation;
    for (let start = 0; start < valid.length;) {
      const first = valid[start]!;
      const panel = panelIds[first]!;
      const key = keys[first]!;
      let end = start + 1;
      while (end < valid.length && panelIds[valid[end]!] === panel && keys[valid[end]!] === key)
        end++;
      const seriesBoundaries: SeriesBoundary[] = [];
      for (let seriesStart = start; seriesStart < end;) {
        const seriesFirst = valid[seriesStart]!;
        const layerIndex = scene.batches[batchIds[seriesFirst]!]!.layerIndex;
        const seriesId = series[seriesFirst]!;
        let seriesEnd = seriesStart + 1;
        while (
          seriesEnd < end &&
          scene.batches[batchIds[valid[seriesEnd]!]!]!.layerIndex === layerIndex &&
          series[valid[seriesEnd]!] === seriesId
        )
          seriesEnd++;
        seriesBoundaries.push({ start: seriesStart, end: seriesEnd, layerIndex, seriesId });
        seriesStart = seriesEnd;
      }
      buckets[axis].set(`${panel}|${key}`, {
        start,
        end,
        series: Object.freeze(seriesBoundaries),
      });
      start = end;
    }
  }

  // Do not retain the growable construction buffers beside their compact
  // typed-array replacements (the 100k-candidate retained-memory budget is
  // measured after this boundary).
  for (const buffer of [
    batchList,
    primitiveList,
    panelList,
    rowList,
    seriesList,
    rankList,
    sourceList,
    lineageList,
    autoModeList,
    xList,
    yList,
    xTokenList,
    yTokenList,
    xDateList,
    yDateList,
    order,
  ])
    buffer.length = 0;
  tokenIndex.clear();

  // Spatial index over plot-px anchors (reuse StaticQuadtree). Point-like
  // candidates shortlist via the tree; rects/segments/paths are refined from a
  // compact extended-geometry list because their hit region can sit far from
  // the stored anchor (bars, long segments, filled paths).
  const spatialXs = Float64Array.from(xs);
  const spatialYs = Float64Array.from(ys);
  const spatial = n > 0 ? new StaticQuadtree(spatialXs, spatialYs) : null;
  const isPoint = new Uint8Array(n);
  const extendedIds: number[] = [];
  let maxPointReach = 0;
  for (let id = 0; id < n; id++) {
    const batch = scene.batches[batchIds[id]!]!;
    if (batch.kind === "points") {
      isPoint[id] = 1;
      maxPointReach = Math.max(maxPointReach, batch.size + 3);
    } else {
      extendedIds.push(id);
    }
  }
  // Far-plane strip bounds: StaticQuadtree prunes on the finite axis only.
  const STRIP = 1e30;

  const exactDistance = (
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null => {
    const batch = scene.batches[batchIds[id]!]!;
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    const x = px - panel.x;
    const y = py - panel.y;
    if (batch.kind === "points") {
      const d = Math.hypot(px - xs[id]!, py - ys[id]!);
      return d <= batch.size + 3 ? d : null;
    }
    if (batch.kind === "rects") {
      const rx = batch.rects[i * 4]!;
      const ry = batch.rects[i * 4 + 1]!;
      const rw = batch.rects[i * 4 + 2]!;
      const rh = batch.rects[i * 4 + 3]!;
      return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh ? 0 : null;
    }
    if (batch.kind === "segments") {
      const d = segmentDistance(
        x,
        y,
        batch.segments[i * 4]!,
        batch.segments[i * 4 + 1]!,
        batch.segments[i * 4 + 2]!,
        batch.segments[i * 4 + 3]!,
      );
      return d <= batch.linewidth / 2 + 3 ? d : null;
    }
    if (batch.kind === "paths") {
      const range = pathRange(batch, i);
      if (batch.fills !== undefined && range !== null) {
        const containmentKey = `${batchIds[id]}:${range[0]}:${range[1]}`;
        let contained = pathContainment.get(containmentKey);
        if (contained === undefined) {
          contained = insidePath(batch, range[0], range[1], x, y);
          pathContainment.set(containmentKey, contained);
        }
        if (contained) return Math.hypot(px - xs[id]!, py - ys[id]!);
      }
      let d = Infinity;
      for (const other of [i - 1, i + 1])
        if (other >= 0 && other < batch.rowIndex.length && samePath(batch, i, other))
          d = Math.min(
            d,
            segmentDistance(
              x,
              y,
              batch.positions[i * 2]!,
              batch.positions[i * 2 + 1]!,
              batch.positions[other * 2]!,
              batch.positions[other * 2 + 1]!,
            ),
          );
      return d <= batch.linewidth / 2 + 3 ? d : null;
    }
    return null;
  };
  const intersects = (id: number, loX: number, loY: number, hiX: number, hiY: number): boolean => {
    const batch = scene.batches[batchIds[id]!]!;
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    if (batch.kind === "rects") {
      const x = panel.x + batch.rects[i * 4]!;
      const y = panel.y + batch.rects[i * 4 + 1]!;
      const w = batch.rects[i * 4 + 2]!;
      const h = batch.rects[i * 4 + 3]!;
      return x <= hiX && x + w >= loX && y <= hiY && y + h >= loY;
    }
    if (batch.kind === "segments") {
      const x1 = panel.x + batch.segments[i * 4]!;
      const y1 = panel.y + batch.segments[i * 4 + 1]!;
      const x2 = panel.x + batch.segments[i * 4 + 2]!;
      const y2 = panel.y + batch.segments[i * 4 + 3]!;
      return segmentIntersectsRect(x1, y1, x2, y2, loX, loY, hiX, hiY);
    }
    if (batch.kind === "paths") {
      if (xs[id]! >= loX && xs[id]! <= hiX && ys[id]! >= loY && ys[id]! <= hiY) return true;
      for (const other of [i - 1, i + 1])
        if (other >= 0 && other < batch.rowIndex.length && samePath(batch, i, other)) {
          const ox = panel.x + batch.positions[other * 2]!;
          const oy = panel.y + batch.positions[other * 2 + 1]!;
          if (segmentIntersectsRect(xs[id]!, ys[id]!, ox, oy, loX, loY, hiX, hiY)) return true;
        }
      const range = pathRange(batch, i);
      if (batch.fills !== undefined && range !== null) {
        const centerX = (loX + hiX) / 2 - panel.x;
        const centerY = (loY + hiY) / 2 - panel.y;
        if (insidePath(batch, range[0], range[1], centerX, centerY)) return true;
      }
      return false;
    }
    return xs[id]! >= loX && xs[id]! <= hiX && ys[id]! >= loY && ys[id]! <= hiY;
  };

  /** Shortlist candidate ids for a nearest query (reverse-id order for topmost ties). */
  const shortlistNearest = (
    px: number,
    py: number,
    mode: CandidateInspectMode,
    maxDistance: number,
  ): number[] => {
    if (spatial === null || n === 0) return [];
    const consider = new Set<number>();
    const addRect = (x0: number, y0: number, x1: number, y1: number) => {
      for (const id of spatial.queryRect(x0, y0, x1, y1)) consider.add(id);
    };
    if (mode === "xy") {
      addRect(px - maxDistance, py - maxDistance, px + maxDistance, py + maxDistance);
    } else if (mode === "x") {
      // Dominant-axis distance is along semantic x (screen y when coord_flip).
      // Axis token maps stay for group(); nearest uses spatial strips.
      if (flip) addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
      else addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
    } else if (mode === "y") {
      if (flip) addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
      else addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
    } else {
      // exact / auto: point anchors within hit reach + all extended geometry
      // (rects/segments/paths can match far from their stored anchors).
      const r = mode === "auto" ? Math.max(maxDistance, maxPointReach) : maxPointReach;
      addRect(px - r, py - r, px + r, py + r);
      if (mode === "auto") {
        // Per-candidate autoMode can still be x/y (e.g. boxplot outliers):
        // include dominant-axis strips so orthogonal distance does not drop them.
        if (flip) {
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
        } else {
          addRect(px - maxDistance, -STRIP, px + maxDistance, STRIP);
          addRect(-STRIP, py - maxDistance, STRIP, py + maxDistance);
        }
      }
      for (const id of extendedIds) consider.add(id);
    }
    return [...consider].toSorted((a, b) => b - a);
  };

  return {
    epoch,
    size: n,
    x: xs,
    y: ys,
    candidate: fact,
    nearest(px, py, search) {
      let best = -1,
        bestDistance = Infinity,
        bestOrth = Infinity;
      const mode: ResolvedCandidateInspectMode = search.mode === "auto" ? "exact" : search.mode;
      let resultMode: ResolvedCandidateInspectMode = mode;
      const pathContainment = new Map<string, boolean>();
      const ids =
        spatial === null
          ? Array.from({ length: n }, (_, id) => n - 1 - id)
          : shortlistNearest(px, py, search.mode, search.maxDistance);
      for (const id of ids) {
        if (search.panelId !== undefined && scene.panels[panelIds[id]!]!.id !== search.panelId)
          continue;
        const candidateMode = search.mode === "auto" ? AUTO_MODES[autoModes[id]!]! : mode;
        if (
          (candidateMode === "x" && xTokenIds[id] === -1) ||
          (candidateMode === "y" && yTokenIds[id] === -1)
        )
          continue;
        const distance =
          candidateMode === "exact"
            ? exactDistance(id, px, py, pathContainment)
            : candidateMode === "x"
              ? Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px))
              : candidateMode === "y"
                ? Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py))
                : Math.hypot(xs[id]! - px, ys[id]! - py);
        if (distance === null || (candidateMode !== "exact" && distance > search.maxDistance))
          continue;
        const orth =
          candidateMode === "x"
            ? Math.abs((flip ? xs[id] : ys[id])! - (flip ? px : py))
            : candidateMode === "y"
              ? Math.abs((flip ? ys[id] : xs[id])! - (flip ? py : px))
              : 0;
        if (distance < bestDistance || (distance === bestDistance && orth < bestOrth)) {
          best = id;
          bestDistance = distance;
          bestOrth = orth;
          resultMode = candidateMode;
        }
      }
      const found = fact(best);
      return found === null ? null : { ...found, distance: bestDistance, mode: resultMode };
    },
    group(seedId, axis) {
      if (seedId < 0 || seedId >= n) return null;
      const keys = axis === "x" ? xTokenIds : yTokenIds;
      const key = keys[seedId];
      if (key === -1 || key === undefined) return null;
      const panel = panelIds[seedId]!;
      const tuple: BucketBoundary | undefined = buckets[axis].get(`${panel}|${key}`);
      if (tuple === undefined) return null;
      const { start, end } = tuple;
      const permutation = permutations[axis];
      const orth = axis === "x" ? (flip ? xs : ys) : flip ? ys : xs;
      const seedLayer = scene.batches[batchIds[seedId]!]!.layerIndex;
      const memberIds = new Uint32Array(tuple.series.length);
      for (let boundaryIndex = 0; boundaryIndex < tuple.series.length; boundaryIndex++) {
        const boundary: SeriesBoundary = tuple.series[boundaryIndex]!;
        if (boundary.layerIndex === seedLayer && boundary.seriesId === series[seedId]) {
          memberIds[boundaryIndex] = seedId;
          continue;
        }
        let chosen = permutation[boundary.start]!;
        for (let cursor = boundary.start + 1; cursor < boundary.end; cursor++) {
          const id = permutation[cursor]!;
          const distance = Math.abs(orth[id]! - orth[seedId]!);
          const priorDistance = Math.abs(orth[chosen]! - orth[seedId]!);
          if (
            distance < priorDistance ||
            (distance === priorDistance &&
              (batchIds[id]! > batchIds[chosen]! ||
                (batchIds[id] === batchIds[chosen] && sources[id]! < sources[chosen]!)))
          )
            chosen = id;
        }
        memberIds[boundaryIndex] = chosen;
      }
      return {
        axis,
        axisValue: logicalValue(seedId, axis),
        token: tokens[key]!,
        focusId: seedId,
        memberIds,
        range: { axis, panelIndex: panel, start, end, permutation },
      };
    },
    traverse(startId, direction = "next") {
      if (n === 0) return null;
      if (direction === "first" || startId === null) return traversal[0]!;
      if (direction === "last") return traversal[n - 1]!;
      if (direction === "next" || direction === "previous") {
        if (!Number.isInteger(startId) || startId < 0 || startId >= n) return traversal[0]!;
        const at = traversalRank[startId]!;
        if (direction === "next") return traversal[(at + 1) % n]!;
        return traversal[(at - 1 + n) % n]!;
      }
      if (!Number.isInteger(startId) || startId < 0 || startId >= n) return traversal[0]!;
      let best = -1;
      let primaryBest = Infinity;
      let orthBest = Infinity;
      for (let id = 0; id < n; id++) {
        if (id === startId || panelIds[id] !== panelIds[startId]) continue;
        const dx = xs[id]! - xs[startId]!;
        const dy = ys[id]! - ys[startId]!;
        const primary =
          direction === "left" ? -dx : direction === "right" ? dx : direction === "up" ? -dy : dy;
        if (primary <= 0) continue;
        const orth = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
        if (primary < primaryBest || (primary === primaryBest && orth < orthBest)) {
          best = id;
          primaryBest = primary;
          orthBest = orth;
        }
      }
      return best < 0 ? startId : best;
    },
    cycle(seedId, step = 1) {
      if (seedId < 0 || seedId >= n) return null;
      const coincident: number[] = [];
      for (let id = 0; id < n; id++) {
        if (panelIds[id] === panelIds[seedId] && xs[id] === xs[seedId] && ys[id] === ys[seedId])
          coincident.push(id);
      }
      const at = coincident.indexOf(seedId);
      const next = (((at + step) % coincident.length) + coincident.length) % coincident.length;
      return coincident[next] ?? seedId;
    },
    queryRect(x0, y0, x1, y1, panelId) {
      const loX = Math.min(x0, x1);
      const hiX = Math.max(x0, x1);
      const loY = Math.min(y0, y1);
      const hiY = Math.max(y0, y1);
      if (spatial === null || n === 0) return EMPTY_UINT32;
      // Point anchors: exact rect membership via the tree. Extended geometry
      // (rects/segments/paths) can intersect far from the anchor — always refine.
      // Collect hits then order by traversal rank (preserves prior contract).
      const hits: number[] = [];
      for (const id of spatial.queryRect(loX, loY, hiX, hiY)) {
        if (isPoint[id] !== 1) continue;
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        hits.push(id);
      }
      for (const id of extendedIds) {
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        if (intersects(id, loX, loY, hiX, hiY)) hits.push(id);
      }
      hits.sort((a, b) => traversalRank[a]! - traversalRank[b]!);
      return Uint32Array.from(hits);
    },
    dispose() {},
  };
}
