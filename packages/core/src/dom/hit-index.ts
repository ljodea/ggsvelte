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
 *  - rects: panel shortlist, then EXACT containment (no slop — bars abut).
 *  - segments: exact point-to-segment distance <= linewidth/2 + tolerance.
 *  - stroked paths (lines): per-edge point-to-segment distance, same rule.
 *  - filled paths (areas/ribbons): even-odd point-in-polygon containment;
 *    the reported row is the nearest subpath vertex's row.
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

/**
 * First edge of [start, end) within linewidth/2 + tolerance of (lx, ly);
 * returns the NEARER endpoint's vertex index, or -1.
 */
function nearestStrokeVertex(
  batch: PathsBatch,
  start: number,
  end: number,
  lx: number,
  ly: number,
  tolerance: number,
): number {
  const slop = batch.linewidth / 2 + tolerance;
  const slop2 = slop * slop;
  for (let i = start; i < end - 1; i++) {
    const x1 = batch.positions[i * 2]!;
    const y1 = batch.positions[i * 2 + 1]!;
    const x2 = batch.positions[(i + 1) * 2]!;
    const y2 = batch.positions[(i + 1) * 2 + 1]!;
    if (segmentDist2(lx, ly, x1, y1, x2, y2) <= slop2) {
      const d1 = (lx - x1) ** 2 + (ly - y1) ** 2;
      const d2 = (lx - x2) ** 2 + (ly - y2) ** 2;
      return d1 <= d2 ? i : i + 1;
    }
  }
  return -1;
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

/** Build the unified hit index for a committed scene. */
export function buildHitIndex(scene: Scene, options: HitIndexOptions = {}): SceneHitIndex {
  const tolerance = options.tolerance ?? DEFAULT_HIT_TOLERANCE;
  const panels = scene.panels;

  // Per points-batch quadtrees over PLOT-px positions.
  const pointsIndex = new Map<GeometryBatch, PointsIndexEntry>();
  for (const batch of scene.batches) {
    if (batch.kind !== "points") continue;
    const panel = panels[batch.panelIndex];
    if (panel === undefined) continue;
    const n = batch.rowIndex.length;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = panel.x + batch.positions[i * 2]!;
      ys[i] = panel.y + batch.positions[i * 2 + 1]!;
    }
    pointsIndex.set(batch, { quadtree: new StaticQuadtree(xs, ys), xs, ys });
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
        // Exact containment, topmost (= last drawn) rect first.
        for (let j = batch.rects.length / 4 - 1; j >= 0; j--) {
          const rx = batch.rects[j * 4]!;
          const ry = batch.rects[j * 4 + 1]!;
          const rw = batch.rects[j * 4 + 2]!;
          const rh = batch.rects[j * 4 + 3]!;
          if (lx >= rx && lx <= rx + rw && ly >= ry && ly <= ry + rh) {
            return {
              layerIndex: batch.layerIndex,
              panelIndex: batch.panelIndex,
              rowIndex: rowOf(batch.rowIndex[j]!),
              x: panel.x + rx + rw / 2,
              y: panel.y + ry,
              kind: "rects",
            };
          }
        }
        return null;
      }
      case "segments": {
        const slop = batch.linewidth / 2 + tolerance;
        const slop2 = slop * slop;
        for (let j = batch.segments.length / 4 - 1; j >= 0; j--) {
          const x1 = batch.segments[j * 4]!;
          const y1 = batch.segments[j * 4 + 1]!;
          const x2 = batch.segments[j * 4 + 2]!;
          const y2 = batch.segments[j * 4 + 3]!;
          if (segmentDist2(lx, ly, x1, y1, x2, y2) <= slop2) {
            return {
              layerIndex: batch.layerIndex,
              panelIndex: batch.panelIndex,
              rowIndex: rowOf(batch.rowIndex[j]!),
              x: x,
              y: y,
              kind: "segments",
            };
          }
        }
        return null;
      }
      case "paths": {
        const filled = batch.fills !== undefined;
        for (let s = batch.pathOffsets.length - 2; s >= 0; s--) {
          const start = batch.pathOffsets[s]!;
          const end = batch.pathOffsets[s + 1]!;
          if (end <= start) continue;
          if (filled) {
            if (!pointInSubpath(batch, start, end, lx, ly)) continue;
            // Nearest vertex's row anchors the hit (areas span many rows).
            const best = nearestVertex(batch, start, end, lx, ly);
            return {
              layerIndex: batch.layerIndex,
              panelIndex: batch.panelIndex,
              rowIndex: rowOf(batch.rowIndex[best]!),
              x: x,
              y: y,
              kind: "paths",
            };
          }
          // Stroked line: per-edge proximity with the documented tolerance.
          const at = nearestStrokeVertex(batch, start, end, lx, ly, tolerance);
          if (at !== -1) {
            return {
              layerIndex: batch.layerIndex,
              panelIndex: batch.panelIndex,
              rowIndex: rowOf(batch.rowIndex[at]!),
              x: panel.x + batch.positions[at * 2]!,
              y: panel.y + batch.positions[at * 2 + 1]!,
              kind: "paths",
            };
          }
        }
        return null;
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
            for (let j = 0; j < batch.rects.length / 4; j++) {
              const rx = panel.x + batch.rects[j * 4]!;
              const ry = panel.y + batch.rects[j * 4 + 1]!;
              const rw = batch.rects[j * 4 + 2]!;
              const rh = batch.rects[j * 4 + 3]!;
              if (rx <= hi.x && rx + rw >= lo.x && ry <= hi.y && ry + rh >= lo.y) {
                push(batch, batch.rowIndex[j]!, rx + rw / 2, ry);
              }
            }
            break;
          }
          case "segments": {
            for (let j = 0; j < batch.segments.length / 4; j++) {
              const sx1 = panel.x + batch.segments[j * 4]!;
              const sy1 = panel.y + batch.segments[j * 4 + 1]!;
              const sx2 = panel.x + batch.segments[j * 4 + 2]!;
              const sy2 = panel.y + batch.segments[j * 4 + 3]!;
              const inRect = (x: number, y: number) =>
                x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y;
              if (inRect(sx1, sy1) || inRect(sx2, sy2)) {
                push(batch, batch.rowIndex[j]!, sx1, sy1);
              }
            }
            break;
          }
          case "paths": {
            for (let i = 0; i < batch.rowIndex.length; i++) {
              const vx = panel.x + batch.positions[i * 2]!;
              const vy = panel.y + batch.positions[i * 2 + 1]!;
              if (vx >= lo.x && vx <= hi.x && vy >= lo.y && vy <= hi.y) {
                push(batch, batch.rowIndex[i]!, vx, vy);
              }
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
