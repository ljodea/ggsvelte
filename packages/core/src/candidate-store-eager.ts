import { StaticQuadtree } from "./dom/quadtree.js";
import { canonicalAxisToken, compareTokens, tokenKey } from "./candidate-axis-token.js";
import type { CanonicalAxisToken } from "./candidate-axis-token.js";
import {
  closestOrthInRange,
  defaultAutoMode,
  directionalNearestInOrder,
  insidePath,
  localAnchor,
  panelRangeInOrder,
  pathRange,
  primitiveCount,
  segmentDistance,
  segmentIntersectsRect,
} from "./candidate-geometry.js";
import type {
  CandidateBuildFacts,
  CandidateFacts,
  CandidateInspectMode,
  CandidateStore,
  CandidateStoreOptions,
  ResolvedCandidateInspectMode,
} from "./candidate-store-types.js";
import type { Scene } from "./scene.js";
import type { CellValue } from "./table.js";

const NO_ROW = 0xffffffff;

/** Shared empty anchors returned by disposed / uninitialized stores. */
export const EMPTY_FLOAT32 = new Float32Array(0);
export const EMPTY_UINT32 = new Uint32Array(0);

const AUTO_MODE_CODE = { exact: 0, x: 1, y: 2, xy: 3 } as const;
const AUTO_MODES = [
  "exact",
  "x",
  "y",
  "xy",
] as const satisfies readonly ResolvedCandidateInspectMode[];

export function buildCandidateStoreEager(
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
      // One O(log P) range lookup; reuse for fill containment and stroke neighbors.
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
      if (range !== null) {
        for (const other of [i - 1, i + 1]) {
          if (other < range[0] || other >= range[1]) continue;
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
        }
      }
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
      const range = pathRange(batch, i);
      if (range !== null) {
        for (const other of [i - 1, i + 1]) {
          if (other < range[0] || other >= range[1]) continue;
          const ox = panel.x + batch.positions[other * 2]!;
          const oy = panel.y + batch.positions[other * 2 + 1]!;
          if (segmentIntersectsRect(xs[id]!, ys[id]!, ox, oy, loX, loY, hiX, hiY)) return true;
        }
        if (batch.fills !== undefined) {
          const centerX = (loX + hiX) / 2 - panel.x;
          const centerY = (loY + hiY) / 2 - panel.y;
          if (insidePath(batch, range[0], range[1], centerX, centerY)) return true;
        }
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
      const seedOrth = orth[seedId]!;
      for (let boundaryIndex = 0; boundaryIndex < tuple.series.length; boundaryIndex++) {
        const boundary: SeriesBoundary = tuple.series[boundaryIndex]!;
        if (boundary.layerIndex === seedLayer && boundary.seriesId === series[seedId]) {
          memberIds[boundaryIndex] = seedId;
          continue;
        }
        // Bucket sort orders ranks before orth. A single layer/series boundary
        // is orth-sorted only when rank is constant across the range; otherwise
        // fall back to linear closest (preserves prior group() semantics).
        const firstId = permutation[boundary.start]!;
        const lastId = permutation[boundary.end - 1]!;
        const orthSorted = ranks[firstId] === ranks[lastId];
        memberIds[boundaryIndex] = closestOrthInRange(
          permutation,
          orth,
          batchIds,
          sources,
          boundary.start,
          boundary.end,
          seedOrth,
          orthSorted,
        );
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
      // left/right/up/down: O(log n + k) via panel-sorted primary axis indexes
      // (not a full O(n) scan). Same panel; min primary > 0; min orth; lower id.
      const panel = panelIds[startId]!;
      if (direction === "left" || direction === "right") {
        const [panelStart, panelEnd] = panelRangeInOrder(orderByX, panelIds, panel);
        return directionalNearestInOrder(
          orderByX,
          xs,
          ys,
          panelStart,
          panelEnd,
          startId,
          xs[startId]!,
          ys[startId]!,
          direction === "right",
        );
      }
      // up/down: reuse traversal (panel → y → x → …).
      const [panelStart, panelEnd] = panelRangeInOrder(traversal, panelIds, panel);
      return directionalNearestInOrder(
        traversal,
        ys,
        xs,
        panelStart,
        panelEnd,
        startId,
        ys[startId]!,
        xs[startId]!,
        direction === "down",
      );
    },
    cycle(seedId, step = 1) {
      if (!Number.isInteger(seedId) || seedId < 0 || seedId >= n) return null;
      const stack = coincidentStack[seedId];
      // No multi-member stack → singleton; step is a no-op.
      if (stack === undefined) return seedId;
      const at = coincidentAt[seedId]!;
      const next = (((at + step) % stack.length) + stack.length) % stack.length;
      // Non-finite / non-integral step yields a non-element index; fall back to seed.
      return stack[next] ?? seedId;
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
