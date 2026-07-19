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
import type { GeometryBatch, Scene } from "./scene.js";
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

/** Plot-space AABB for a path subpath range, padded by stroke half-width + hit tol. */
function pathSubpathAabb(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panelX: number,
  panelY: number,
  start: number,
  end: number,
  fallbackX: number,
  fallbackY: number,
  hitTolerance: number,
): readonly [number, number, number, number] {
  const pad = batch.linewidth / 2 + hitTolerance;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let v = start; v < end; v++) {
    const px = panelX + batch.positions[v * 2]!;
    const py = panelY + batch.positions[v * 2 + 1]!;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  if (minX > maxX) return [fallbackX, fallbackY, fallbackX, fallbackY];
  return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}

/**
 * Plot-space AABB for the stroke segments incident on vertex `i` within
 * half-open subpath [start, end). Used for stroked (non-fill) path candidates
 * so one long series does not land every vertex in a plot-sized size class
 * (hit-index edge shortlist pattern). Pad = linewidth/2 + hit tol.
 */
function pathVertexStrokeAabb(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panelX: number,
  panelY: number,
  i: number,
  start: number,
  end: number,
  hitTolerance: number,
): readonly [number, number, number, number] {
  const pad = batch.linewidth / 2 + hitTolerance;
  let minX = panelX + batch.positions[i * 2]!;
  let minY = panelY + batch.positions[i * 2 + 1]!;
  let maxX = minX;
  let maxY = minY;
  for (const other of [i - 1, i + 1]) {
    if (other < start || other >= end) continue;
    const ox = panelX + batch.positions[other * 2]!;
    const oy = panelY + batch.positions[other * 2 + 1]!;
    if (ox < minX) minX = ox;
    if (oy < minY) minY = oy;
    if (ox > maxX) maxX = ox;
    if (oy > maxY) maxY = oy;
  }
  return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}

export function buildCandidateStoreEager(
  scene: Scene,
  options: CandidateStoreOptions = {},
): CandidateStore {
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
  // candidates shortlist via the tree; rects/segments/paths/glyphs use
  // size-classed AABB-center trees so hit regions far from anchors still
  // shortlist without force-adding every extended id. Classes bucket by
  // log2(max half-extent) so one giant AABB cannot expand every query to O(E).
  const spatialXs = Float64Array.from(xs);
  const spatialYs = Float64Array.from(ys);
  const spatial = n > 0 ? new StaticQuadtree(spatialXs, spatialYs) : null;
  const isPoint = new Uint8Array(n);
  const pointIdsByBatch = new Map<number, number[]>();
  const extendedIds: number[] = [];
  const extMinXBuild: number[] = [];
  const extMinYBuild: number[] = [];
  const extMaxXBuild: number[] = [];
  const extMaxYBuild: number[] = [];
  // Subpath AABB cache: `${batchIndex}:${start}:${end}` → box (plot px).
  const pathAabbCache = new Map<string, readonly [number, number, number, number]>();
  let maxPointReach = 0;
  for (let id = 0; id < n; id++) {
    const batch = scene.batches[batchIds[id]!]!;
    if (batch.kind === "points") {
      isPoint[id] = 1;
      maxPointReach = Math.max(maxPointReach, batch.size + hitTolerance);
      const ids = pointIdsByBatch.get(batchIds[id]!);
      if (ids === undefined) pointIdsByBatch.set(batchIds[id]!, [id]);
      else ids.push(id);
      continue;
    }
    extendedIds.push(id);
    const panel = scene.panels[panelIds[id]!]!;
    const i = primitiveIds[id]!;
    let minX: number;
    let minY: number;
    let maxX: number;
    let maxY: number;
    if (batch.kind === "rects") {
      const rx = panel.x + batch.rects[i * 4]!;
      const ry = panel.y + batch.rects[i * 4 + 1]!;
      const rw = batch.rects[i * 4 + 2]!;
      const rh = batch.rects[i * 4 + 3]!;
      minX = Math.min(rx, rx + rw);
      minY = Math.min(ry, ry + rh);
      maxX = Math.max(rx, rx + rw);
      maxY = Math.max(ry, ry + rh);
    } else if (batch.kind === "segments") {
      const pad = batch.linewidth / 2 + hitTolerance;
      const x1 = panel.x + batch.segments[i * 4]!;
      const y1 = panel.y + batch.segments[i * 4 + 1]!;
      const x2 = panel.x + batch.segments[i * 4 + 2]!;
      const y2 = panel.y + batch.segments[i * 4 + 3]!;
      minX = Math.min(x1, x2) - pad;
      minY = Math.min(y1, y2) - pad;
      maxX = Math.max(x1, x2) + pad;
      maxY = Math.max(y1, y2) + pad;
    } else if (batch.kind === "paths") {
      // Filled paths: full subpath AABB (containment far from any vertex).
      // Stroked paths: AABB of incident edges only — a plot-spanning series
      // used to tag every vertex with the same giant box, forcing Θ(V) refine
      // on nearest/exact (hit-index already edge-shortlists strokes).
      const range = pathRange(batch, i);
      if (range === null) {
        minX = xs[id]!;
        minY = ys[id]!;
        maxX = minX;
        maxY = minY;
      } else if (batch.fills === undefined) {
        const box = pathVertexStrokeAabb(
          batch,
          panel.x,
          panel.y,
          i,
          range[0],
          range[1],
          hitTolerance,
        );
        minX = box[0];
        minY = box[1];
        maxX = box[2];
        maxY = box[3];
      } else {
        const cacheKey = `${batchIds[id]}:${range[0]}:${range[1]}`;
        let box = pathAabbCache.get(cacheKey);
        if (box === undefined) {
          box = pathSubpathAabb(
            batch,
            panel.x,
            panel.y,
            range[0],
            range[1],
            xs[id]!,
            ys[id]!,
            hitTolerance,
          );
          pathAabbCache.set(cacheKey, box);
        }
        minX = box[0];
        minY = box[1];
        maxX = box[2];
        maxY = box[3];
      }
    } else {
      // glyphs: text is not a hit target (hit-index), but still needs a finite
      // AABB so store init never pathRange()'s a non-path batch (Codex P1).
      const pad = batch.size + hitTolerance;
      minX = xs[id]! - pad;
      minY = ys[id]! - pad;
      maxX = xs[id]! + pad;
      maxY = ys[id]! + pad;
    }
    extMinXBuild.push(minX);
    extMinYBuild.push(minY);
    extMaxXBuild.push(maxX);
    extMaxYBuild.push(maxY);
  }
  pathAabbCache.clear();

  // Pointer hit testing preserves reverse paint order and per-batch point
  // radius without expanding every query by the largest point in the scene.
  // This mirrors paint batches while remaining private to CandidateStore.
  const pointBatchIndexes = [...pointIdsByBatch.entries()].map(([batchIndex, ids]) => {
    const pointXs = new Float64Array(ids.length);
    const pointYs = new Float64Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      pointXs[i] = xs[ids[i]!]!;
      pointYs[i] = ys[ids[i]!]!;
    }
    return {
      batchIndex,
      ids,
      spatial: new StaticQuadtree(pointXs, pointYs),
    };
  });
  pointIdsByBatch.clear();

  const extN = extendedIds.length;
  const extMinX = Float64Array.from(extMinXBuild);
  const extMinY = Float64Array.from(extMinYBuild);
  const extMaxX = Float64Array.from(extMaxXBuild);
  const extMaxY = Float64Array.from(extMaxYBuild);
  extMinXBuild.length = 0;
  extMinYBuild.length = 0;
  extMaxXBuild.length = 0;
  extMaxYBuild.length = 0;

  // Size-class trees: class key = ceil(log2(max half-extent)).
  type ExtendedClass = {
    readonly eis: readonly number[];
    readonly maxHalfW: number;
    readonly maxHalfH: number;
    readonly spatial: StaticQuadtree;
  };
  const classBuckets = new Map<number, number[]>();
  for (let ei = 0; ei < extN; ei++) {
    const halfW = (extMaxX[ei]! - extMinX[ei]!) / 2;
    const halfH = (extMaxY[ei]! - extMinY[ei]!) / 2;
    const m = Math.max(halfW, halfH, 1e-9);
    const key = Math.min(31, Math.ceil(Math.log2(m)));
    const bucket = classBuckets.get(key);
    if (bucket === undefined) classBuckets.set(key, [ei]);
    else bucket.push(ei);
  }
  const extendedClasses: ExtendedClass[] = [];
  for (const eis of classBuckets.values()) {
    const cxs = new Float64Array(eis.length);
    const cys = new Float64Array(eis.length);
    let maxHalfW = 0;
    let maxHalfH = 0;
    for (let j = 0; j < eis.length; j++) {
      const ei = eis[j]!;
      const halfW = (extMaxX[ei]! - extMinX[ei]!) / 2;
      const halfH = (extMaxY[ei]! - extMinY[ei]!) / 2;
      cxs[j] = (extMinX[ei]! + extMaxX[ei]!) / 2;
      cys[j] = (extMinY[ei]! + extMaxY[ei]!) / 2;
      if (halfW > maxHalfW) maxHalfW = halfW;
      if (halfH > maxHalfH) maxHalfH = halfH;
    }
    extendedClasses.push({
      eis,
      maxHalfW,
      maxHalfH,
      spatial: new StaticQuadtree(cxs, cys),
    });
  }
  classBuckets.clear();

  /** Add extended ids whose AABB intersects the axis-aligned query box. */
  const addExtendedIntersecting = (
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: Set<number> | number[],
  ): void => {
    for (const cls of extendedClasses) {
      // Intersecting AABBs have centers inside query expanded by *this class's*
      // half-extents — not the global max (avoids one giant bar scanning all E).
      for (const j of cls.spatial.queryRect(
        loX - cls.maxHalfW,
        loY - cls.maxHalfH,
        hiX + cls.maxHalfW,
        hiY + cls.maxHalfH,
      )) {
        const ei = cls.eis[j]!;
        if (extMaxX[ei]! < loX || extMinX[ei]! > hiX || extMaxY[ei]! < loY || extMinY[ei]! > hiY)
          continue;
        const id = extendedIds[ei]!;
        if (Array.isArray(into)) into.push(id);
        else into.add(id);
      }
    }
  };

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
      return d <= batch.size + hitTolerance ? d : null;
    }
    if (batch.kind === "rects") {
      const rx = batch.rects[i * 4]!;
      const ry = batch.rects[i * 4 + 1]!;
      const rw = batch.rects[i * 4 + 2]!;
      const rh = batch.rects[i * 4 + 3]!;
      return x >= Math.min(rx, rx + rw) &&
        x <= Math.max(rx, rx + rw) &&
        y >= Math.min(ry, ry + rh) &&
        y <= Math.max(ry, ry + rh)
        ? 0
        : null;
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
      return d <= batch.linewidth / 2 + hitTolerance ? d : null;
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
        return null;
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
      return d <= batch.linewidth / 2 + hitTolerance ? d : null;
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
      const otherX = x + w;
      const otherY = y + h;
      return (
        Math.min(x, otherX) <= hiX &&
        Math.max(x, otherX) >= loX &&
        Math.min(y, otherY) <= hiY &&
        Math.max(y, otherY) >= loY
      );
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
      // exact / auto: point anchors within hit reach + extended geometry whose
      // AABB meets the probe (rects/segments/paths can sit far from anchors).
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
      // exact containment uses the point AABB; auto still needs maxDistance pad
      // for dominant-axis extended matches that refine after shortlist.
      const pad = mode === "auto" ? maxDistance : 0;
      addExtendedIntersecting(px - pad, py - pad, px + pad, py + pad, consider);
    }
    return [...consider].toSorted((a, b) => b - a);
  };

  return {
    epoch,
    size: n,
    x: xs,
    y: ys,
    candidate: fact,
    hitTest(px, py) {
      let best = -1;
      let bestBatch = -1;
      let bestDistance = Infinity;
      let bestPathStart = -1;
      let bestPathEdge = Infinity;
      const pathContainment = new Map<string, boolean>();

      for (let index = pointBatchIndexes.length - 1; index >= 0; index--) {
        const entry = pointBatchIndexes[index]!;
        const batch = scene.batches[entry.batchIndex]!;
        if (batch.kind !== "points") continue;
        const panel = scene.panels[batch.panelIndex];
        if (
          panel === undefined ||
          px < panel.x ||
          px > panel.x + panel.width ||
          py < panel.y ||
          py > panel.y + panel.height
        )
          continue;
        const localId = entry.spatial.nearestWithin(px, py, batch.size + hitTolerance);
        if (localId < 0) continue;
        best = entry.ids[localId]!;
        bestBatch = entry.batchIndex;
        bestDistance = Math.hypot(xs[best]! - px, ys[best]! - py);
        break;
      }

      const extended: number[] = [];
      addExtendedIntersecting(px, py, px, py, extended);
      extended.sort((a, b) => b - a);
      for (const id of extended) {
        const batchIndex = batchIds[id]!;
        if (batchIndex < bestBatch) continue;
        const batch = scene.batches[batchIndex]!;
        if (batch.kind === "glyphs") continue;
        const panel = scene.panels[panelIds[id]!]!;
        if (
          px < panel.x ||
          px > panel.x + panel.width ||
          py < panel.y ||
          py > panel.y + panel.height
        )
          continue;
        const distance = exactDistance(id, px, py, pathContainment);
        if (distance === null) continue;
        const sameBatch = batchIndex === bestBatch;
        const primitive = primitiveIds[id]!;
        const range = batch.kind === "paths" ? pathRange(batch, primitive) : null;
        const pathStart = range?.[0] ?? -1;
        let pathEdge = Infinity;
        let candidateId = id;
        let anchorDistance = Math.hypot(xs[id]! - px, ys[id]! - py);
        if (batch.kind === "paths" && batch.fills === undefined && range !== null) {
          const localX = px - panel.x;
          const localY = py - panel.y;
          const slop = batch.linewidth / 2 + hitTolerance;
          for (const edge of [primitive - 1, primitive]) {
            if (edge < range[0] || edge + 1 >= range[1]) continue;
            if (
              segmentDistance(
                localX,
                localY,
                batch.positions[edge * 2]!,
                batch.positions[edge * 2 + 1]!,
                batch.positions[(edge + 1) * 2]!,
                batch.positions[(edge + 1) * 2 + 1]!,
              ) <= slop
            )
              pathEdge = Math.min(pathEdge, edge);
          }
          if (!Number.isFinite(pathEdge)) continue;
          const firstDistance = Math.hypot(
            batch.positions[pathEdge * 2]! - localX,
            batch.positions[pathEdge * 2 + 1]! - localY,
          );
          const secondDistance = Math.hypot(
            batch.positions[(pathEdge + 1) * 2]! - localX,
            batch.positions[(pathEdge + 1) * 2 + 1]! - localY,
          );
          const chosenPrimitive = firstDistance <= secondDistance ? pathEdge : pathEdge + 1;
          candidateId = id - primitive + chosenPrimitive;
          anchorDistance = Math.min(firstDistance, secondDistance);
        }
        const improvesWithinBatch =
          batch.kind === "paths"
            ? pathStart > bestPathStart ||
              (pathStart === bestPathStart &&
                (batch.fills === undefined
                  ? pathEdge < bestPathEdge
                  : anchorDistance < bestDistance ||
                    (anchorDistance === bestDistance &&
                      primitive < (best < 0 ? Infinity : primitiveIds[best]!))))
            : primitive > (best < 0 ? -1 : primitiveIds[best]!);
        if (batchIndex > bestBatch || (sameBatch && improvesWithinBatch)) {
          best = candidateId;
          bestBatch = batchIndex;
          bestDistance = batch.kind === "paths" ? anchorDistance : distance;
          bestPathStart = pathStart;
          bestPathEdge = pathEdge;
        }
      }
      return fact(best);
    },
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
    traverse(startId, direction = "next", step) {
      if (n === 0) return null;
      if (direction === "first") return traversal[0]!;
      if (direction === "last") return traversal[n - 1]!;
      if (direction === "next" || direction === "previous") {
        if (startId !== null && (!Number.isInteger(startId) || startId < 0 || startId >= n))
          return traversal[0]!;
        // Preserve the original null-start contract when callers omit step.
        if (startId === null && step === undefined) return traversal[0]!;
        const resolvedStep = step ?? 1;
        if (!Number.isInteger(resolvedStep) || !Number.isFinite(resolvedStep)) return startId;
        const at = startId === null ? -1 : traversalRank[startId]!;
        const delta = direction === "next" ? resolvedStep : -resolvedStep;
        const next = (((at + delta) % n) + n) % n;
        return traversal[next]!;
      }
      if (startId === null) return traversal[0]!;
      if (!Number.isInteger(startId) || startId < 0 || startId >= n) return traversal[0]!;
      // left/right/up/down: O(log n + k) via panel-sorted primary axis indexes
      // (not a full O(n) scan). Same panel; min primary > 0; min orth; topmost id.
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
      const extendedHits: number[] = [];
      addExtendedIntersecting(loX, loY, hiX, hiY, extendedHits);
      for (const id of extendedHits) {
        if (panelId !== undefined && scene.panels[panelIds[id]!]!.id !== panelId) continue;
        if (intersects(id, loX, loY, hiX, hiY)) hits.push(id);
      }
      hits.sort((a, b) => traversalRank[a]! - traversalRank[b]!);
      return Uint32Array.from(hits);
    },
    dispose() {},
  };
}
