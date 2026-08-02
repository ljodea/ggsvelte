import { compareTokens } from "./candidate-axis-token.js";
import type { CanonicalAxisToken } from "./candidate-axis-token.js";
import {
  defaultAutoMode,
  candidatePrimitiveCount,
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

/** Anchor equality matching the old `${x}` string-key grouping: ±0 equal, NaN ≈ NaN. */
function sameAnchorCoord(u: number, v: number): boolean {
  return u === v || (Number.isNaN(u) && Number.isNaN(v));
}
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

/** Compact typed-array indexes + traversal/group tables for an assembled candidate store. */
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
  readonly buckets: Record<"x" | "y", Map<number, BucketBoundary>>;
  logicalValue(id: number, axis: "x" | "y"): CellValue;
  fact(id: number): CandidateFacts | null;
};

/**
 * Build candidate identity tables, traversal orders, coincident stacks, and
 * group() bucket permutations. Growable construction buffers are cleared at
 * the end of this function (retained-memory budget boundary).
 */
/**
 * Exclusive end of the (layer, series) run starting at `from` within
 * `valid[0..end)` — extracted to keep the bucket walk under the nesting
 * budget and to give the hot scan a tight local frame.
 */
function seriesRunEnd(
  valid: number[],
  from: number,
  end: number,
  layerPerCandidate: Uint32Array,
  series: Uint32Array,
  layerIndex: number,
  seriesId: number,
): number {
  let cursor = from + 1;
  while (cursor < end) {
    const id = valid[cursor]!;
    if (layerPerCandidate[id]! !== layerIndex || series[id] !== seriesId) break;
    cursor++;
  }
  return cursor;
}

export function buildCandidateStoreIndexes(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStoreIndexes {
  const epoch = options.epoch ?? 0;
  const flip = options.flip ?? false;
  const hitTolerance = options.hitTolerance ?? 3;
  const uninspectable = options.uninspectableLayers;
  // Capacity-first construction: growable number[] buffers paid a push
  // (with capacity doubling) plus a full typed-array conversion copy per
  // candidate column. Upper-bound the candidate count up front and write
  // the final typed arrays directly; trim to the exact count at the end.
  let capacity = 0;
  for (const batch of scene.batches) {
    if (scene.panels[batch.panelIndex] === undefined) continue;
    if (uninspectable?.has(batch.layerIndex) === true) continue;
    // Exact candidate count (not primitiveCount): path batches reserve per
    // ANCHOR, not per tessellated vertex, and candidates:false batches
    // reserve nothing — otherwise map/area layers briefly reserve memory
    // for every vertex and pay 15 slice() copies to shrink it back.
    capacity += candidatePrimitiveCount(batch);
  }
  const batchIdsBuf = new Uint32Array(capacity);
  const primitiveIdsBuf = new Uint32Array(capacity);
  const panelIdsBuf = new Uint32Array(capacity);
  const rowsBuf = new Uint32Array(capacity);
  const seriesBuf = new Uint32Array(capacity);
  const ranksBuf = new Uint32Array(capacity);
  const sourcesBuf = new Uint32Array(capacity);
  const lineagesBuf = new Uint32Array(capacity);
  const autoModesBuf = new Uint8Array(capacity);
  const xsBuf = new Float32Array(capacity);
  const ysBuf = new Float32Array(capacity);
  const xTokenIdsBuf = new Int32Array(capacity);
  const yTokenIdsBuf = new Int32Array(capacity);
  const xDatesBuf = new Uint8Array(capacity);
  const yDatesBuf = new Uint8Array(capacity);
  const invalidX = new Map<number, CellValue>();
  const invalidY = new Map<number, CellValue>();
  // NaN / ±Infinity plot-px anchors make the traversal comparator's
  // subtraction unstable; tracked here so coincident grouping can pick a
  // finite-only fast path.
  let anyNonFiniteAnchor = false;
  const sizeValues: CellValue[] = [];
  const linewidthValues: CellValue[] = [];
  const alphaValues: CellValue[] = [];
  const shapeValues: CellValue[] = [];
  const linetypeValues: CellValue[] = [];
  const tokens: CanonicalAxisToken[] = [];
  // Kind-dispatched interning: the previous single Map keyed on tokenKey()
  // strings paid one `n:${value}` / `s:${len}:${value}` allocation per
  // candidate per axis; per-kind maps key on the value itself. Intern order
  // (first-seen id) is unchanged, so downstream token ids are identical.
  const numberTokenIndex = new Map<number, number>();
  const stringTokenIndex = new Map<string, number>();
  const booleanTokenIndex = new Map<boolean, number>();
  // Peek by raw value before allocating a CanonicalAxisToken: a repeat hit
  // (dense plots repeat axis values constantly) then costs one Map lookup
  // and no object allocation. Misses allocate the same token
  // canonicalAxisToken would build (Date → epoch number, -0 → 0).
  const remember = (value: CellValue): number => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return -1;
      const canonical = Object.is(value, -0) ? 0 : value;
      const prior = numberTokenIndex.get(canonical);
      if (prior !== undefined) return prior;
      const id = tokens.length;
      tokens.push({ kind: "number", value: canonical });
      numberTokenIndex.set(canonical, id);
      return id;
    }
    if (typeof value === "string") {
      const prior = stringTokenIndex.get(value);
      if (prior !== undefined) return prior;
      const id = tokens.length;
      tokens.push({ kind: "string", value });
      stringTokenIndex.set(value, id);
      return id;
    }
    if (typeof value === "boolean") {
      const prior = booleanTokenIndex.get(value);
      if (prior !== undefined) return prior;
      const id = tokens.length;
      tokens.push({ kind: "boolean", value });
      booleanTokenIndex.set(value, id);
      return id;
    }
    if (value instanceof Date) {
      const time = value.getTime();
      if (!Number.isFinite(time)) return -1;
      const prior = numberTokenIndex.get(time);
      if (prior !== undefined) return prior;
      const id = tokens.length;
      tokens.push({ kind: "number", value: time });
      numberTokenIndex.set(time, id);
      return id;
    }
    return -1;
  };

  let n = 0;
  for (let batchIndex = 0; batchIndex < scene.batches.length; batchIndex++) {
    const batch = scene.batches[batchIndex]!;
    const panel = scene.panels[batch.panelIndex];
    if (panel === undefined) continue;
    // Layer opted out of inspection (#1065) — paint it, never target it.
    if (uninspectable?.has(batch.layerIndex) === true) continue;
    for (let primitiveIndex = 0; primitiveIndex < primitiveCount(batch); primitiveIndex++) {
      if (!isCandidatePrimitive(batch, primitiveIndex)) continue;
      const candidateIndex = n;
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
      batchIdsBuf[n] = batchIndex;
      primitiveIdsBuf[n] = primitiveIndex;
      panelIdsBuf[n] = batch.panelIndex;
      rowsBuf[n] = rowIndex ?? NO_ROW;
      const ax = panel.x + lx;
      const ay = panel.y + ly;
      xsBuf[n] = ax;
      ysBuf[n] = ay;
      // Read the NARROWED f32 values back: a finite double that overflows
      // float32 (e.g. 1e39) is stored as ±Infinity, and the fast paths below
      // must see the same (non-)finiteness the stored columns carry.
      if (!Number.isFinite(xsBuf[n]!) || !Number.isFinite(ysBuf[n]!)) anyNonFiniteAnchor = true;
      const xToken = remember(xValue);
      const yToken = remember(yValue);
      xTokenIdsBuf[n] = xToken;
      yTokenIdsBuf[n] = yToken;
      xDatesBuf[n] = xValue instanceof Date ? 1 : 0;
      yDatesBuf[n] = yValue instanceof Date ? 1 : 0;
      if (xToken === -1 && xValue !== null) invalidX.set(candidateIndex, xValue);
      if (yToken === -1 && yValue !== null) invalidY.set(candidateIndex, yValue);
      const series = datum.seriesId ?? 0;
      seriesBuf[n] = series;
      ranksBuf[n] = datum.seriesRank ?? series;
      sourcesBuf[n] = datum.sourceOrder ?? rowIndex ?? primitiveIndex;
      lineagesBuf[n] = datum.lineage ?? 0;
      autoModesBuf[n] = AUTO_MODE_CODE[datum.autoMode ?? defaultAutoMode(batch, primitiveIndex)]!;
      n++;
    }
  }

  // Exact-count trim: when eligibility skipped primitives the capacity was
  // an upper bound, so slice the tails off (a view when exact — the common
  // all-candidates case — a copy otherwise).
  const trim = <T extends { slice(start: number, end: number): T; length: number }>(arr: T): T =>
    n === arr.length ? arr : arr.slice(0, n);
  const batchIds = trim(batchIdsBuf);
  const primitiveIds = trim(primitiveIdsBuf);
  const panelIds = trim(panelIdsBuf);
  const rows = trim(rowsBuf);
  const series = trim(seriesBuf);
  const ranks = trim(ranksBuf);
  const sources = trim(sourcesBuf);
  const lineages = trim(lineagesBuf);
  const autoModes = trim(autoModesBuf);
  const xs = trim(xsBuf);
  const ys = trim(ysBuf);
  const xTokenIds = trim(xTokenIdsBuf);
  const yTokenIds = trim(yTokenIdsBuf);
  const xDates = trim(xDatesBuf);
  const yDates = trim(yDatesBuf);

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
    const emitCoincidentRun = (ids: Uint32Array, runStart: number, runEnd: number): void => {
      const length = runEnd - runStart;
      if (length < 2) return;
      // Typed arrays are not freezeable in all runtimes; treat as immutable by convention.
      // Members are ascending id (candidate ids are assigned in batch-then-
      // primitive order, the traversal sort's trailing keys), matching the old
      // id-order push sequence.
      const stack = new Uint32Array(length);
      for (let j = 0; j < length; j++) stack[j] = ids[runStart + j]!;
      for (let j = 0; j < length; j++) {
        const id = stack[j]!;
        coincidentStack[id] = stack;
        coincidentAt[id] = j;
      }
    };
    if (anyNonFiniteAnchor) {
      // Non-finite anchors: the traversal comparator's subtraction is unstable
      // on NaN, so group with explicit string-key-equivalent semantics —
      // String() is injective on widened Float32 values, String(-0) === "0"
      // groups ±0, and "NaN" groups NaN anchors with NaN anchors.
      const cmpCoord = (u: number, v: number): number => {
        if (sameAnchorCoord(u, v)) return 0;
        if (Number.isNaN(u)) return -1;
        if (Number.isNaN(v)) return 1;
        return u < v ? -1 : 1;
      };
      const byCoincidence = Uint32Array.from({ length: n }, (_, id) => id);
      byCoincidence.sort(
        (a, b) =>
          panelIds[a]! - panelIds[b]! ||
          cmpCoord(xs[a]!, xs[b]!) ||
          cmpCoord(ys[a]!, ys[b]!) ||
          a - b,
      );
      let runStart = 0;
      for (let i = 1; i <= n; i++) {
        const first = byCoincidence[runStart]!;
        const current = i < n ? byCoincidence[i]! : -1;
        if (
          i < n &&
          panelIds[current] === panelIds[first] &&
          sameAnchorCoord(xs[current]!, xs[first]!) &&
          sameAnchorCoord(ys[current]!, ys[first]!)
        )
          continue;
        emitCoincidentRun(byCoincidence, runStart, i);
        runStart = i;
      }
    } else {
      // Fast path: with all-finite anchors, traversal order (panel, y, x,
      // batch, primitive) makes coincident (panel, x, y) runs contiguous —
      // zero extra sorting. ±0 pairs are equal under the comparator's
      // subtraction, matching the old string-key grouping.
      let runStart = 0;
      for (let i = 1; i <= n; i++) {
        const first = traversal[runStart]!;
        const current = i < n ? traversal[i]! : -1;
        if (
          i < n &&
          panelIds[current] === panelIds[first] &&
          xs[current] === xs[first] &&
          ys[current] === ys[first]
        )
          continue;
        emitCoincidentRun(traversal, runStart, i);
        runStart = i;
      }
    }
  }
  const permutations: Record<"x" | "y", Uint32Array> = {
    x: new Uint32Array(0),
    y: new Uint32Array(0),
  };
  const buckets: Record<"x" | "y", Map<number, BucketBoundary>> = {
    x: new Map<number, BucketBoundary>(),
    y: new Map<number, BucketBoundary>(),
  };
  // Rank tokens once (m log m, m = unique tokens) so the permutation sort's
  // hot comparator is arithmetic instead of compareTokens object dispatch.
  // Ranks preserve compareTokens order exactly.
  const tokenRank = new Int32Array(tokens.length);
  {
    const tokenOrder = Array.from({ length: tokens.length }, (_, id) => id);
    tokenOrder.sort((a, b) => compareTokens(tokens[a]!, tokens[b]!));
    for (let rank = 0; rank < tokenOrder.length; rank++) tokenRank[tokenOrder[rank]!] = rank;
  }
  // Per-candidate layer ids, read once — the permutation comparator and the
  // bucket boundary walk otherwise chase scene.batches[…].layerIndex per
  // comparison.
  const layerPerCandidate = new Uint32Array(n);
  for (let id = 0; id < n; id++) layerPerCandidate[id] = scene.batches[batchIds[id]!]!.layerIndex;
  // Bucket maps key on panel * tokenCount + tokenId (numeric, no per-bucket
  // `${panel}|${key}` strings — dense plots have O(n) buckets).
  const tokenCount = Math.max(tokens.length, 1);
  const bucketKey = (panel: number, tokenId: number): number => panel * tokenCount + tokenId;
  for (const axis of ["x", "y"] as const) {
    const keys = axis === "x" ? xTokenIds : yTokenIds,
      orth = axis === "x" ? (flip ? xs : ys) : flip ? ys : xs;
    const valid = order.filter((id) => keys[id] !== -1);
    valid.sort(
      (a, b) =>
        panelIds[a]! - panelIds[b]! ||
        tokenRank[keys[a]!]! - tokenRank[keys[b]!]! ||
        ranks[a]! - ranks[b]! ||
        layerPerCandidate[a]! - layerPerCandidate[b]! ||
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
        const layerIndex = layerPerCandidate[seriesFirst]!;
        const seriesId = series[seriesFirst]!;
        const seriesEnd = seriesRunEnd(
          valid,
          seriesStart,
          end,
          layerPerCandidate,
          series,
          layerIndex,
          seriesId,
        );
        seriesBoundaries.push({ start: seriesStart, end: seriesEnd, layerIndex, seriesId });
        seriesStart = seriesEnd;
      }
      // The boundaries array is built locally and never mutated after this
      // point; treat as immutable by convention (same contract as the
      // coincident stacks) instead of paying one Object.freeze per bucket —
      // dense plots have O(n) buckets.
      buckets[axis].set(bucketKey(panel, key), {
        start,
        end,
        series: seriesBoundaries,
      });
      start = end;
    }
  }

  // Do not retain construction scratch beside the store (the 100k-candidate
  // retained-memory budget is measured after this boundary). The per-
  // candidate columns were written into their final typed arrays directly,
  // so only the permutation scratch order and the interning maps remain.
  order.length = 0;
  numberTokenIndex.clear();
  stringTokenIndex.clear();
  booleanTokenIndex.clear();
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
