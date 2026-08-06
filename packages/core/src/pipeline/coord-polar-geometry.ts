/**
 * Polar projection of completed geometry batches (rects → annular sectors).
 */
import type { PanelCoordProjector } from "../coord-projector.js";
import type { GeometryBatch, PathsBatch, RectsBatch } from "../scene.js";

import {
  MAX_COORD_VERTICES_PER_SUBPATH,
  projectPoint,
  type CoordTessellationBudget,
} from "./coord-tessellation.js";
import type { PipelineWarning } from "./types.js";

/** Samples per rect edge under polar (outer/inner arcs need denser sampling). */
const POLAR_RECT_EDGE_SAMPLES = 16;

/**
 * Convert axis-aligned panel rects into closed polar sector paths and project
 * point/glyph anchors. Mutates `batches` in place where possible; rect batches
 * are replaced with path batches in the returned array.
 */
export function projectPolarGeometryBatches(
  batches: GeometryBatch[],
  projector: PanelCoordProjector,
  width: number,
  height: number,
  _warnings: PipelineWarning[],
  _sharedBudget?: CoordTessellationBudget,
): GeometryBatch[] {
  if (projector.polar === undefined) return batches;
  const out: GeometryBatch[] = [];
  for (const batch of batches) {
    if (batch.kind === "rects") {
      out.push(rectsToPolarPaths(batch, projector, width, height));
      continue;
    }
    if (batch.kind === "points" || batch.kind === "glyphs") {
      const pos = batch.positions;
      for (let i = 0; i < pos.length; i += 2) {
        const [x, y] = projectPoint(projector, width, height, pos[i]!, pos[i + 1]!);
        pos[i] = x;
        pos[i + 1] = y;
      }
      out.push(batch);
      continue;
    }
    // paths / segments: handled by projectGeometryBatch tessellation
    out.push(batch);
  }
  return out;
}

function rectsToPolarPaths(
  batch: RectsBatch,
  projector: PanelCoordProjector,
  width: number,
  height: number,
): PathsBatch {
  const n = batch.rects.length / 4;
  const positions: number[] = [];
  const rowIndex: number[] = [];
  const pathOffsets: number[] = [0];
  const semanticAnchors: number[] = [];
  const semanticIndex: number[] = [];
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  const alphas: number[] = [];
  const hasAlphas = batch.alphas !== undefined;
  const hasStrokeWidths = batch.strokeWidths !== undefined;
  const strokeWidths: number[] = [];
  const hasLinetypes = batch.linetypeIndexes !== undefined;
  const linetypeIndexes: number[] = [];

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const x = batch.rects[o]!;
    const y = batch.rects[o + 1]!;
    const w = batch.rects[o + 2]!;
    const h = batch.rects[o + 3]!;
    // Rect in panel px (y = top). Corners in y-down: TL, TR, BR, BL.
    // Walk edges with denser sampling so polar arcs stay smooth.
    const corners: Array<readonly [number, number]> = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
    const ring: number[] = [];
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = corners[e]!;
      const [x1, y1] = corners[(e + 1) % 4]!;
      const samples = POLAR_RECT_EDGE_SAMPLES;
      // Emit each edge's start corner (t=0) and stop short of the next (t < 1).
      // The next edge supplies that corner — do NOT skip s===0 on later edges
      // (that chamfers corners and leaves gaps between pie slices).
      for (let s = 0; s < samples; s++) {
        const t = s / samples;
        const px = x0 + (x1 - x0) * t;
        const py = y0 + (y1 - y0) * t;
        const [qx, qy] = projectPoint(projector, width, height, px, py);
        ring.push(qx, qy);
      }
    }
    // Cap ring length for safety
    const maxVerts = MAX_COORD_VERTICES_PER_SUBPATH;
    const vertCount = Math.min(ring.length / 2, maxVerts);
    const row = batch.rowIndex[i] ?? 0xffffffff;
    for (let v = 0; v < vertCount; v++) {
      positions.push(ring[v * 2]!, ring[v * 2 + 1]!);
      rowIndex.push(row);
      // One semantic candidate per sector (munch vertices are presentation-only).
      semanticAnchors.push(v === 0 ? 1 : 0);
      semanticIndex.push(i);
    }
    pathOffsets.push(positions.length / 2);
    // fillRole "paper" + null fill is a hollow rect under Cartesian; PathsBatch
    // has no fillRole, so keep null (theme accent) rather than inventing paper
    // without a theme token here. Mapped fills always win.
    fills.push(batch.fills?.[i] ?? batch.fill);
    const stroke = batch.strokes?.[i] ?? (batch.stroke === undefined ? null : batch.stroke);
    strokes.push(stroke);
    if (hasAlphas) alphas.push(batch.alphas![i] ?? batch.alpha);
    if (hasStrokeWidths) strokeWidths.push(batch.strokeWidths![i] ?? batch.strokeWidth ?? 1);
    if (hasLinetypes) linetypeIndexes.push(batch.linetypeIndexes![i] ?? 0);
  }

  const hasStroke =
    strokes.some((s) => s !== null) || batch.strokeWidth !== undefined || hasStrokeWidths;
  const pathBatch: PathsBatch = {
    kind: "paths",
    layerIndex: batch.layerIndex,
    panelIndex: batch.panelIndex,
    positions: Float32Array.from(positions),
    rowIndex: Uint32Array.from(rowIndex),
    semanticAnchors: Uint8Array.from(semanticAnchors),
    semanticIndex: Uint32Array.from(semanticIndex),
    pathOffsets: Uint32Array.from(pathOffsets),
    strokes,
    fills,
    closed: true,
    // Preserve author outlines: explicit strokeWidth, else a 1px hairline when a
    // stroke color is present. No stroke color + no width → unstroked sectors.
    linewidth: batch.strokeWidth ?? (hasStroke ? 1 : 0),
    alpha: hasAlphas ? 1 : batch.alpha,
    curve: "linear",
  };
  if (hasAlphas) pathBatch.alphas = Float32Array.from(alphas);
  if (hasStrokeWidths) pathBatch.linewidths = Float32Array.from(strokeWidths);
  if (batch.linetype !== undefined) pathBatch.linetype = batch.linetype;
  if (hasLinetypes) pathBatch.linetypeIndexes = Uint8Array.from(linetypeIndexes);
  if (batch.fillPaint !== undefined) pathBatch.fillPaint = batch.fillPaint;
  if (batch.strokePaint !== undefined) pathBatch.strokePaint = batch.strokePaint;
  if (batch.glow !== undefined) pathBatch.glow = batch.glow;
  return pathBatch;
}
