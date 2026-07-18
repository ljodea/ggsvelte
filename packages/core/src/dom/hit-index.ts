/**
 * Unified hit index (plan: "Interactivity — unified hit index").
 *
 * Built ONCE per committed Scene, in PLOT-pixel space, from layout output —
 * never from DOM geometry (decision 0006). The single event-capture layer
 * converts client coordinates to plot px and asks this index; the answer is
 * independent of which stratum (SVG or canvas) painted the mark.
 *
 * Per-kind tests (plan round-2 fix — bbox alone cannot hit-test paths):
 *  - points: hand-rolled static quadtree (see quadtree.ts for why it is not
 *    a d3-quadtree port); hit radius = mark radius + tolerance, nearest wins.
 *  - rects: size-classed AABB-center shortlist, then EXACT containment
 *    (no slop — bars abut). Size classes prevent one giant bar from
 *    expanding every small-bar query to O(R) — same pattern as CandidateStore
 *    extended geometry (#264).
 *  - segments: size-classed AABB-center shortlist (endpoint box), then exact
 *    point-to-segment distance <= linewidth/2 + tolerance. Same size-class
 *    pattern as rects so one long rule cannot expand every short-segment query.
 *  - stroked paths (lines): size-classed *edge* AABB shortlist, then exact
 *    point-to-segment distance (pad by linewidth/2 + tolerance). Edge shortlist
 *    keeps long single-series polylines O(log E + k), not O(E).
 *  - filled paths (areas/ribbons): size-classed subpath AABB shortlist, then
 *    even-odd point-in-polygon; the reported row is the nearest vertex's row.
 *    queryRect uses a vertex StaticQuadtree (O(log V + k)).
 *  - glyphs (text): NOT hit targets in M2 (documented limitation — labels
 *    annotate marks; hovering the mark is the interaction).
 *
 * DEFAULT TOLERANCE: 3 px (documented) — about half a fingertip-scaled
 * pointer slop at 1x, chosen so 1px rules remain hoverable without stealing
 * hits from neighboring marks.
 *
 * Topmost wins: batches are tested in REVERSE paint order; panels clip, so
 * a probe outside a panel's rect never matches that panel's marks (matching
 * the renderers' clipPath/ctx.clip behavior).
 */
import type { GeometryBatch, PathsBatch, Scene, ScenePanel } from "../scene.js";

import { StaticQuadtree } from "./quadtree.js";

const NO_ROW = 0xffffffff;

/** Default hit slop around points and strokes, in px. */
export const DEFAULT_HIT_TOLERANCE = 3;

export interface SceneHit {
  layerIndex: number;
  panelIndex: number;
  /** Source data row (null for synthesized marks, e.g. boxplot outliers). */
  rowIndex: number | null;
  /** Tooltip anchor in PLOT px. */
  x: number;
  y: number;
  kind: GeometryBatch["kind"];
}

export interface HitIndexOptions {
  /** Hit slop around points and strokes in px (default 3, documented). */
  tolerance?: number;
}

export interface SceneHitIndex {
  /** Topmost mark at a plot-px position, or null. */
  hitTest(x: number, y: number): SceneHit | null;
  /** All marks intersecting a plot-px rect (brush selection), deduplicated
   *  by (layer, row); synthesized rows (rowIndex null) are excluded. */
  queryRect(x0: number, y0: number, x1: number, y1: number): SceneHit[];
}

function rowOf(raw: number): number | null {
  return raw === NO_ROW ? null : raw;
}

/** Squared distance from a point to a segment. */
function segmentDist2(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return (px - cx) * (px - cx) + (py - cy) * (py - cy);
}

/** Even-odd point-in-polygon over one subpath of a paths batch. */
function pointInSubpath(
  batch: PathsBatch,
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

/** Vertex of [start, end) nearest to (lx, ly). */
function nearestVertex(
  batch: PathsBatch,
  start: number,
  end: number,
  lx: number,
  ly: number,
): number {
  let best = start;
  let bestD2 = Infinity;
  for (let i = start; i < end; i++) {
    const dx = batch.positions[i * 2]! - lx;
    const dy = batch.positions[i * 2 + 1]! - ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

function insidePanel(panel: ScenePanel, x: number, y: number, slop: number): boolean {
  return (
    x >= panel.x - slop &&
    x <= panel.x + panel.width + slop &&
    y >= panel.y - slop &&
    y <= panel.y + panel.height + slop
  );
}

interface PointsIndexEntry {
  quadtree: StaticQuadtree;
  xs: Float64Array;
  ys: Float64Array;
}

/** One size class of AABB centers (plot px) — rects and segments. */
interface AabbSizeClass {
  readonly indices: readonly number[];
  readonly maxHalfW: number;
  readonly maxHalfH: number;
  readonly spatial: StaticQuadtree;
}

/** Size-classed AABB-center trees (plot px). */
interface AabbIndexEntry {
  readonly minX: Float64Array;
  readonly minY: Float64Array;
  readonly maxX: Float64Array;
  readonly maxY: Float64Array;
  readonly classes: readonly AabbSizeClass[];
}

/**
 * Bucket AABBs by ceil(log2(max half-extent)) and build a center quadtree per
 * class so one giant box cannot expand every small-primitive query to O(n).
 */
function buildAabbIndex(
  minX: Float64Array,
  minY: Float64Array,
  maxX: Float64Array,
  maxY: Float64Array,
): AabbIndexEntry {
  const n = minX.length;
  const buckets = new Map<number, number[]>();
  for (let j = 0; j < n; j++) {
    const halfW = (maxX[j]! - minX[j]!) / 2;
    const halfH = (maxY[j]! - minY[j]!) / 2;
    const key = Math.min(31, Math.ceil(Math.log2(Math.max(halfW, halfH, 1e-9))));
    const list = buckets.get(key);
    if (list === undefined) buckets.set(key, [j]);
    else list.push(j);
  }
  const classes: AabbSizeClass[] = [];
  for (const indices of buckets.values()) {
    const cxs = new Float64Array(indices.length);
    const cys = new Float64Array(indices.length);
    let maxHalfW = 0;
    let maxHalfH = 0;
    for (let k = 0; k < indices.length; k++) {
      const j = indices[k]!;
      const halfW = (maxX[j]! - minX[j]!) / 2;
      const halfH = (maxY[j]! - minY[j]!) / 2;
      cxs[k] = (minX[j]! + maxX[j]!) / 2;
      cys[k] = (minY[j]! + maxY[j]!) / 2;
      if (halfW > maxHalfW) maxHalfW = halfW;
      if (halfH > maxHalfH) maxHalfH = halfH;
    }
    classes.push({
      indices,
      maxHalfW,
      maxHalfH,
      spatial: new StaticQuadtree(cxs, cys),
    });
  }
  return { minX, minY, maxX, maxY, classes };
}

function buildRectsIndex(
  batch: Extract<GeometryBatch, { kind: "rects" }>,
  panel: ScenePanel,
): AabbIndexEntry {
  const n = batch.rects.length / 4;
  const minX = new Float64Array(n);
  const minY = new Float64Array(n);
  const maxX = new Float64Array(n);
  const maxY = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const rx = panel.x + batch.rects[j * 4]!;
    const ry = panel.y + batch.rects[j * 4 + 1]!;
    const rw = batch.rects[j * 4 + 2]!;
    const rh = batch.rects[j * 4 + 3]!;
    minX[j] = Math.min(rx, rx + rw);
    minY[j] = Math.min(ry, ry + rh);
    maxX[j] = Math.max(rx, rx + rw);
    maxY[j] = Math.max(ry, ry + rh);
  }
  return buildAabbIndex(minX, minY, maxX, maxY);
}

function buildSegmentsIndex(
  batch: Extract<GeometryBatch, { kind: "segments" }>,
  panel: ScenePanel,
): AabbIndexEntry {
  const n = batch.segments.length / 4;
  const minX = new Float64Array(n);
  const minY = new Float64Array(n);
  const maxX = new Float64Array(n);
  const maxY = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const x1 = panel.x + batch.segments[j * 4]!;
    const y1 = panel.y + batch.segments[j * 4 + 1]!;
    const x2 = panel.x + batch.segments[j * 4 + 2]!;
    const y2 = panel.y + batch.segments[j * 4 + 3]!;
    minX[j] = Math.min(x1, x2);
    minY[j] = Math.min(y1, y2);
    maxX[j] = Math.max(x1, x2);
    maxY[j] = Math.max(y1, y2);
  }
  return buildAabbIndex(minX, minY, maxX, maxY);
}

/**
 * Path spatial indexes (plot px):
 *  - subpaths: fill hitTest shortlist
 *  - edges: stroke hitTest shortlist only (omitted for filled area batches)
 *  - vertices: queryRect brush shortlist
 */
interface PathsIndexEntry {
  readonly subpaths: AabbIndexEntry;
  /** Present only for stroked (non-fill) path batches. */
  readonly edges: AabbIndexEntry | null;
  readonly edgeStart: Uint32Array | null;
  readonly edgeSubpath: Uint32Array | null;
  readonly vertices: PointsIndexEntry;
}

function buildPathsIndex(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  panel: ScenePanel,
): PathsIndexEntry {
  const nSub = Math.max(0, batch.pathOffsets.length - 1);
  const minX = new Float64Array(nSub);
  const minY = new Float64Array(nSub);
  const maxX = new Float64Array(nSub);
  const maxY = new Float64Array(nSub);
  const filled = batch.fills !== undefined;
  // Count stroke edges only when the batch is stroke-tested (not area fill).
  let edgeCount = 0;
  for (let s = 0; s < nSub; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    if (!filled && end > start + 1) edgeCount += end - start - 1;
    let sMinX = Infinity;
    let sMinY = Infinity;
    let sMaxX = -Infinity;
    let sMaxY = -Infinity;
    for (let i = start; i < end; i++) {
      const vx = panel.x + batch.positions[i * 2]!;
      const vy = panel.y + batch.positions[i * 2 + 1]!;
      if (vx < sMinX) sMinX = vx;
      if (vy < sMinY) sMinY = vy;
      if (vx > sMaxX) sMaxX = vx;
      if (vy > sMaxY) sMaxY = vy;
    }
    if (end <= start) {
      minX[s] = 0;
      minY[s] = 0;
      maxX[s] = 0;
      maxY[s] = 0;
    } else {
      minX[s] = sMinX;
      minY[s] = sMinY;
      maxX[s] = sMaxX;
      maxY[s] = sMaxY;
    }
  }
  let edges: AabbIndexEntry | null = null;
  let edgeStart: Uint32Array | null = null;
  let edgeSubpath: Uint32Array | null = null;
  if (!filled && edgeCount > 0) {
    const eMinX = new Float64Array(edgeCount);
    const eMinY = new Float64Array(edgeCount);
    const eMaxX = new Float64Array(edgeCount);
    const eMaxY = new Float64Array(edgeCount);
    edgeStart = new Uint32Array(edgeCount);
    edgeSubpath = new Uint32Array(edgeCount);
    let e = 0;
    for (let s = 0; s < nSub; s++) {
      const start = batch.pathOffsets[s]!;
      const end = batch.pathOffsets[s + 1]!;
      for (let i = start; i < end - 1; i++) {
        const x1 = panel.x + batch.positions[i * 2]!;
        const y1 = panel.y + batch.positions[i * 2 + 1]!;
        const x2 = panel.x + batch.positions[(i + 1) * 2]!;
        const y2 = panel.y + batch.positions[(i + 1) * 2 + 1]!;
        eMinX[e] = Math.min(x1, x2);
        eMinY[e] = Math.min(y1, y2);
        eMaxX[e] = Math.max(x1, x2);
        eMaxY[e] = Math.max(y1, y2);
        edgeStart[e] = i;
        edgeSubpath[e] = s;
        e++;
      }
    }
    edges = buildAabbIndex(eMinX, eMinY, eMaxX, eMaxY);
  }
  const nVert = batch.rowIndex.length;
  const xs = new Float64Array(nVert);
  const ys = new Float64Array(nVert);
  for (let i = 0; i < nVert; i++) {
    xs[i] = panel.x + batch.positions[i * 2]!;
    ys[i] = panel.y + batch.positions[i * 2 + 1]!;
  }
  return {
    subpaths: buildAabbIndex(minX, minY, maxX, maxY),
    edges,
    edgeStart,
    edgeSubpath,
    vertices: { quadtree: new StaticQuadtree(xs, ys), xs, ys },
  };
}

/**
 * Primitive indices whose AABB intersects [loX,hiX]×[loY,hiY] (plot px).
 * Optional pad expands the query (stroke slop around segments).
 */
function shortlistAabbIntersecting(
  entry: AabbIndexEntry,
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
  pad = 0,
): number[] {
  const out: number[] = [];
  const qLoX = loX - pad;
  const qLoY = loY - pad;
  const qHiX = hiX + pad;
  const qHiY = hiY + pad;
  for (const cls of entry.classes) {
    for (const k of cls.spatial.queryRect(
      qLoX - cls.maxHalfW,
      qLoY - cls.maxHalfH,
      qHiX + cls.maxHalfW,
      qHiY + cls.maxHalfH,
    )) {
      const j = cls.indices[k]!;
      if (
        entry.maxX[j]! < qLoX ||
        entry.minX[j]! > qHiX ||
        entry.maxY[j]! < qLoY ||
        entry.minY[j]! > qHiY
      )
        continue;
      out.push(j);
    }
  }
  return out;
}

/** Build the unified hit index for a committed scene. */
export function buildHitIndex(scene: Scene, options: HitIndexOptions = {}): SceneHitIndex {
  const tolerance = options.tolerance ?? DEFAULT_HIT_TOLERANCE;
  const panels = scene.panels;

  // Per points-batch quadtrees; per rects/segments/paths size-classed AABB trees.
  const pointsIndex = new Map<GeometryBatch, PointsIndexEntry>();
  const rectsIndex = new Map<GeometryBatch, AabbIndexEntry>();
  const segmentsIndex = new Map<GeometryBatch, AabbIndexEntry>();
  const pathsIndex = new Map<GeometryBatch, PathsIndexEntry>();
  for (const batch of scene.batches) {
    const panel = panels[batch.panelIndex];
    if (panel === undefined) continue;
    if (batch.kind === "points") {
      const n = batch.rowIndex.length;
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        xs[i] = panel.x + batch.positions[i * 2]!;
        ys[i] = panel.y + batch.positions[i * 2 + 1]!;
      }
      pointsIndex.set(batch, { quadtree: new StaticQuadtree(xs, ys), xs, ys });
    } else if (batch.kind === "rects") {
      rectsIndex.set(batch, buildRectsIndex(batch, panel));
    } else if (batch.kind === "segments") {
      segmentsIndex.set(batch, buildSegmentsIndex(batch, panel));
    } else if (batch.kind === "paths") {
      pathsIndex.set(batch, buildPathsIndex(batch, panel));
    }
  }

  function hitBatch(batch: GeometryBatch, x: number, y: number): SceneHit | null {
    const panel = panels[batch.panelIndex];
    if (panel === undefined) return null;
    // Marks are clipped to their panel; the hit index honors the clip.
    if (!insidePanel(panel, x, y, 0)) return null;
    const lx = x - panel.x;
    const ly = y - panel.y;

    switch (batch.kind) {
      case "points": {
        const entry = pointsIndex.get(batch);
        if (entry === undefined) return null;
        const i = entry.quadtree.nearestWithin(x, y, batch.size + tolerance);
        if (i === -1) return null;
        return {
          layerIndex: batch.layerIndex,
          panelIndex: batch.panelIndex,
          rowIndex: rowOf(batch.rowIndex[i]!),
          x: entry.xs[i]!,
          y: entry.ys[i]!,
          kind: "points",
        };
      }
      case "rects": {
        // Size-class AABB shortlist, then exact containment; topmost = highest j.
        const entry = rectsIndex.get(batch);
        if (entry === undefined) return null;
        let best = -1;
        for (const cls of entry.classes) {
          for (const k of cls.spatial.queryRect(
            x - cls.maxHalfW,
            y - cls.maxHalfH,
            x + cls.maxHalfW,
            y + cls.maxHalfH,
          )) {
            const j = cls.indices[k]!;
            if (
              x >= entry.minX[j]! &&
              x <= entry.maxX[j]! &&
              y >= entry.minY[j]! &&
              y <= entry.maxY[j]! &&
              j > best
            )
              best = j;
          }
        }
        if (best < 0) return null;
        const rx = batch.rects[best * 4]!;
        const ry = batch.rects[best * 4 + 1]!;
        const rw = batch.rects[best * 4 + 2]!;
        return {
          layerIndex: batch.layerIndex,
          panelIndex: batch.panelIndex,
          rowIndex: rowOf(batch.rowIndex[best]!),
          x: panel.x + rx + rw / 2,
          y: panel.y + ry,
          kind: "rects",
        };
      }
      case "segments": {
        // Size-class AABB shortlist (pad by stroke slop), then exact distance;
        // topmost = highest j among hits.
        const entry = segmentsIndex.get(batch);
        if (entry === undefined) return null;
        const slop = batch.linewidth / 2 + tolerance;
        const slop2 = slop * slop;
        let best = -1;
        for (const j of shortlistAabbIntersecting(entry, x, y, x, y, slop)) {
          const x1 = batch.segments[j * 4]!;
          const y1 = batch.segments[j * 4 + 1]!;
          const x2 = batch.segments[j * 4 + 2]!;
          const y2 = batch.segments[j * 4 + 3]!;
          if (segmentDist2(lx, ly, x1, y1, x2, y2) <= slop2 && j > best) best = j;
        }
        if (best < 0) return null;
        return {
          layerIndex: batch.layerIndex,
          panelIndex: batch.panelIndex,
          rowIndex: rowOf(batch.rowIndex[best]!),
          x: x,
          y: y,
          kind: "segments",
        };
      }
      case "paths": {
        // Fill: subpath AABB shortlist + point-in-polygon.
        // Stroke: edge AABB shortlist + exact distance (dense polylines stay
        // O(log E + k), not O(E)). Topmost = highest subpath; within a subpath
        // the first edge in vertex order wins (matches nearestStrokeVertex).
        const entry = pathsIndex.get(batch);
        if (entry === undefined) return null;
        const filled = batch.fills !== undefined;
        if (filled) {
          let bestS = -1;
          let bestVertex = -1;
          for (const s of shortlistAabbIntersecting(entry.subpaths, x, y, x, y, 0)) {
            const start = batch.pathOffsets[s]!;
            const end = batch.pathOffsets[s + 1]!;
            if (end <= start) continue;
            if (!pointInSubpath(batch, start, end, lx, ly)) continue;
            if (s > bestS) {
              bestS = s;
              bestVertex = nearestVertex(batch, start, end, lx, ly);
            }
          }
          if (bestS < 0 || bestVertex < 0) return null;
          return {
            layerIndex: batch.layerIndex,
            panelIndex: batch.panelIndex,
            rowIndex: rowOf(batch.rowIndex[bestVertex]!),
            x: x,
            y: y,
            kind: "paths",
          };
        }
        if (entry.edges === null || entry.edgeStart === null || entry.edgeSubpath === null)
          return null;
        const pad = batch.linewidth / 2 + tolerance;
        const slop2 = pad * pad;
        let bestS = -1;
        let bestEdgeStart = -1;
        let bestVertex = -1;
        for (const e of shortlistAabbIntersecting(entry.edges, x, y, x, y, pad)) {
          const i = entry.edgeStart[e]!;
          const s = entry.edgeSubpath[e]!;
          const x1 = batch.positions[i * 2]!;
          const y1 = batch.positions[i * 2 + 1]!;
          const x2 = batch.positions[(i + 1) * 2]!;
          const y2 = batch.positions[(i + 1) * 2 + 1]!;
          if (segmentDist2(lx, ly, x1, y1, x2, y2) > slop2) continue;
          if (s < bestS) continue;
          if (s === bestS && i >= bestEdgeStart && bestEdgeStart >= 0) continue;
          const d1 = (lx - x1) ** 2 + (ly - y1) ** 2;
          const d2 = (lx - x2) ** 2 + (ly - y2) ** 2;
          bestS = s;
          bestEdgeStart = i;
          bestVertex = d1 <= d2 ? i : i + 1;
        }
        if (bestVertex < 0) return null;
        return {
          layerIndex: batch.layerIndex,
          panelIndex: batch.panelIndex,
          rowIndex: rowOf(batch.rowIndex[bestVertex]!),
          x: panel.x + batch.positions[bestVertex * 2]!,
          y: panel.y + batch.positions[bestVertex * 2 + 1]!,
          kind: "paths",
        };
      }
      case "glyphs":
        // Text marks are not hit targets in M2 (module docs).
        return null;
      default:
        return null;
    }
  }

  return {
    hitTest(x: number, y: number): SceneHit | null {
      for (let b = scene.batches.length - 1; b >= 0; b--) {
        const hit = hitBatch(scene.batches[b]!, x, y);
        if (hit !== null) return hit;
      }
      return null;
    },

    queryRect(x0: number, y0: number, x1: number, y1: number): SceneHit[] {
      const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) };
      const hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
      const out: SceneHit[] = [];
      const seen = new Set<string>();
      const push = (batch: GeometryBatch, raw: number, x: number, y: number) => {
        const row = rowOf(raw);
        if (row === null) return; // selections are source-row sets
        const key = `${batch.layerIndex}:${row}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          layerIndex: batch.layerIndex,
          panelIndex: batch.panelIndex,
          rowIndex: row,
          x,
          y,
          kind: batch.kind,
        });
      };
      for (const batch of scene.batches) {
        const panel = panels[batch.panelIndex];
        if (panel === undefined) continue;
        switch (batch.kind) {
          case "points": {
            const entry = pointsIndex.get(batch);
            if (entry === undefined) break;
            for (const i of entry.quadtree.queryRect(lo.x, lo.y, hi.x, hi.y)) {
              push(batch, batch.rowIndex[i]!, entry.xs[i]!, entry.ys[i]!);
            }
            break;
          }
          case "rects": {
            const entry = rectsIndex.get(batch);
            if (entry === undefined) break;
            for (const j of shortlistAabbIntersecting(entry, lo.x, lo.y, hi.x, hi.y)) {
              // Anchor matches hitTest / pre-index behavior: panel + raw origin.
              const rx = batch.rects[j * 4]!;
              const ry = batch.rects[j * 4 + 1]!;
              const rw = batch.rects[j * 4 + 2]!;
              push(batch, batch.rowIndex[j]!, panel.x + rx + rw / 2, panel.y + ry);
            }
            break;
          }
          case "segments": {
            // Shortlist by endpoint AABB, then preserve endpoint-in-rect semantics.
            const entry = segmentsIndex.get(batch);
            if (entry === undefined) break;
            for (const j of shortlistAabbIntersecting(entry, lo.x, lo.y, hi.x, hi.y)) {
              const sx1 = panel.x + batch.segments[j * 4]!;
              const sy1 = panel.y + batch.segments[j * 4 + 1]!;
              const sx2 = panel.x + batch.segments[j * 4 + 2]!;
              const sy2 = panel.y + batch.segments[j * 4 + 3]!;
              const inRect = (px: number, py: number) =>
                px >= lo.x && px <= hi.x && py >= lo.y && py <= hi.y;
              if (inRect(sx1, sy1) || inRect(sx2, sy2)) {
                push(batch, batch.rowIndex[j]!, sx1, sy1);
              }
            }
            break;
          }
          case "paths": {
            // Vertex quadtree shortlist (same brush membership as linear scan).
            const entry = pathsIndex.get(batch);
            if (entry === undefined) break;
            for (const i of entry.vertices.quadtree.queryRect(lo.x, lo.y, hi.x, hi.y)) {
              push(batch, batch.rowIndex[i]!, entry.vertices.xs[i]!, entry.vertices.ys[i]!);
            }
            break;
          }
          case "glyphs":
            break;
        }
      }
      return out;
    },
  };
}
