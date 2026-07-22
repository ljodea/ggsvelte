import { canonicalAxisToken, compareTokens, tokenKey } from "./candidate-axis-token.js";
import type { CanonicalAxisToken } from "./candidate-axis-token.js";
import {
  defaultAutoMode,
  isCandidatePrimitive,
  localAnchor,
  primitiveCount,
} from "./candidate-geometry.js";
import type {
  CandidateBuildFacts,
  CandidateFacts,
  CandidateStoreOptions,
  ResolvedCandidateInspectMode,
} from "./candidate-store-types.js";
import type { Scene } from "./scene.js";
import type { CellValue } from "./table.js";

const NO_ROW = 0xffffffff;

const AUTO_MODE_CODE = { exact: 0, x: 1, y: 2, xy: 3 } as const;
export const AUTO_MODES = [
  "exact",
  "x",
  "y",
  "xy",
] as const satisfies readonly ResolvedCandidateInspectMode[];

export type SeriesBoundary = Readonly<{
  start: number;
  end: number;
  layerIndex: number;
  seriesId: number;
}>;

export type BucketBoundary = Readonly<{
  start: number;
  end: number;
  series: readonly SeriesBoundary[];
}>;

/** Compact typed-array indexes + traversal/group tables for an eager candidate store. */
export type CandidateStoreIndexes = {
  readonly scene: Scene;
  readonly epoch: number;
  readonly flip: boolean;
  readonly hitTolerance: number;
  readonly n: number;
  readonly batchIds: Uint32Array;
  readonly primitiveIds: Uint32Array;
  readonly panelIds: Uint32Array;
  readonly rows: Uint32Array;
  readonly series: Uint32Array;
  readonly ranks: Uint32Array;
  readonly sources: Uint32Array;
  readonly lineages: Uint32Array;
  readonly autoModes: Uint8Array;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly xTokenIds: Int32Array;
  readonly yTokenIds: Int32Array;
  readonly xDates: Uint8Array;
  readonly yDates: Uint8Array;
  readonly tokens: CanonicalAxisToken[];
  readonly invalidX: Map<number, CellValue>;
  readonly invalidY: Map<number, CellValue>;
  readonly traversal: Uint32Array;
  readonly traversalRank: Uint32Array;
  readonly orderByX: Uint32Array;
  readonly coincidentStack: (Uint32Array | undefined)[];
  readonly coincidentAt: Uint32Array;
  readonly permutations: Record<"x" | "y", Uint32Array>;
  readonly buckets: Record<"x" | "y", Map<string, BucketBoundary>>;
  logicalValue(id: number, axis: "x" | "y"): CellValue;
  fact(id: number): CandidateFacts | null;
};

/**
 * Build candidate identity tables, traversal orders, coincident stacks, and
 * group() bucket permutations. Growable construction buffers are cleared at
 * the end of this function (retained-memory budget boundary).
 */
export function buildCandidateStoreIndexes(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStoreIndexes {
  const epoch = options.epoch ?? 0;
  const flip = options.flip ?? false;
  const hitTolerance = options.hitTolerance ?? 3;
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
  const sizeValues: CellValue[] = [];
  const linewidthValues: CellValue[] = [];
  const alphaValues: CellValue[] = [];
  const shapeValues: CellValue[] = [];
  const linetypeValues: CellValue[] = [];
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
      if (!isCandidatePrimitive(batch, primitiveIndex)) continue;
      const candidateIndex = batchList.length;
      const raw = batch.rowIndex[primitiveIndex] ?? NO_ROW;
      const rowIndex = raw === NO_ROW ? null : raw;
      const [lx, ly] = localAnchor(batch, primitiveIndex);
      const buildFacts: CandidateBuildFacts = {
        candidateIndex,
        batchIndex,
        primitiveIndex:
          batch.kind === "paths"
            ? (batch.semanticIndex?.[primitiveIndex] ?? primitiveIndex)
            : primitiveIndex,
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
      sizeValues.push(datum.sizeValue ?? null);
      linewidthValues.push(datum.linewidthValue ?? null);
      alphaValues.push(datum.alphaValue ?? null);
      shapeValues.push(datum.shapeValue ?? null);
      linetypeValues.push(datum.linetypeValue ?? null);
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
      sizeValue: sizeValues[id] ?? null,
      linewidthValue: linewidthValues[id] ?? null,
      alphaValue: alphaValues[id] ?? null,
      shapeValue: shapeValues[id] ?? null,
      linetypeValue: linetypeValues[id] ?? null,
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

  // Panel-then-x order for left/right directional traverse (O(log n + k)).
  // Up/down reuses `traversal` (already sorted panel → y → x → …).
  // Non-finite primary coords sort after finite so lower_bound stays valid.
  const orderByX = Uint32Array.from({ length: n }, (_, id) => id);
  orderByX.sort((a, b) => {
    const panelDelta = panelIds[a]! - panelIds[b]!;
    if (panelDelta !== 0) return panelDelta;
    const xa = xs[a]!;
    const xb = xs[b]!;
    const aFinite = Number.isFinite(xa);
    const bFinite = Number.isFinite(xb);
    if (aFinite && bFinite) {
      const d = xa - xb;
      if (d !== 0) return d;
    } else if (aFinite !== bFinite) return aFinite ? -1 : 1;
    return a - b;
  });

  // Coincident multi-member stacks by (panel, x, y) in paint/source order (ascending id).
  // Singletons are omitted so dense plots do not retain n one-element Uint32Arrays;
  // `cycle` treats a missing stack as identity. Multi-member stacks make cycle O(1).
  const coincidentStack: (Uint32Array | undefined)[] = Array.from({ length: n });
  const coincidentAt = new Uint32Array(n);
  {
    const groups = new Map<string, number[]>();
    for (let id = 0; id < n; id++) {
      const key = `${panelIds[id]!}|${xs[id]!}|${ys[id]!}`;
      let members = groups.get(key);
      if (members === undefined) {
        members = [];
        groups.set(key, members);
      }
      members.push(id);
    }
    for (const members of groups.values()) {
      if (members.length >= 2) {
        // Typed arrays are not freezeable in all runtimes; treat as immutable by convention.
        const stack = Uint32Array.from(members);
        for (let i = 0; i < members.length; i++) {
          const id = members[i]!;
          coincidentStack[id] = stack;
          coincidentAt[id] = i;
        }
      }
      members.length = 0;
    }
    groups.clear();
  }
  const permutations: Record<"x" | "y", Uint32Array> = {
    x: new Uint32Array(0),
    y: new Uint32Array(0),
  };
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
  return {
    scene,
    epoch,
    flip,
    hitTolerance,
    n,
    batchIds,
    primitiveIds,
    panelIds,
    rows,
    series,
    ranks,
    sources,
    lineages,
    autoModes,
    xs,
    ys,
    xTokenIds,
    yTokenIds,
    xDates,
    yDates,
    tokens,
    invalidX,
    invalidY,
    traversal,
    traversalRank,
    orderByX,
    coincidentStack,
    coincidentAt,
    permutations,
    buckets,
    logicalValue,
    fact,
  };
}
