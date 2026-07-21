import type { PanelCoordProjector } from "../coord-projector.js";
import { segmentDistance } from "../candidate-geometry.js";
import type { GeometryBatch, PathsBatch } from "../scene.js";

import type { PipelineWarning } from "./types.js";

const COORD_TESSELLATION_TOLERANCE_PX = 0.5;
const MAX_COORD_TESSELLATION_DEPTH = 12;
const MAX_COORD_VERTICES_PER_SUBPATH = 4096;
const MAX_COORD_VERTICES_PER_PANEL_LAYER = 65_536;

export interface CoordTessellationBudget {
  extraRemaining: number;
  mandatoryVertices: number;
}

export function createCoordTessellationBudget(
  batches: readonly GeometryBatch[],
): CoordTessellationBudget {
  let mandatoryVertices = 0;
  for (const batch of batches) {
    if (batch.kind === "paths") mandatoryVertices += batch.positions.length / 2;
    else if (batch.kind === "segments") mandatoryVertices += batch.segments.length / 2;
  }
  return {
    mandatoryVertices,
    extraRemaining: Math.max(0, MAX_COORD_VERTICES_PER_PANEL_LAYER - mandatoryVertices),
  };
}

function projectPoint(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x: number,
  y: number,
): readonly [number, number] {
  const tx = projector.x.projectFraction(x / width);
  const ty = projector.y.projectFraction(1 - y / height);
  return [tx * width, (1 - ty) * height];
}

function unprojectPoint(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x: number,
  y: number,
): readonly [number, number] {
  const tx = projector.x.invertFraction(x / width);
  const ty = projector.y.invertFraction(1 - y / height);
  return [tx * width, (1 - ty) * height];
}

function tessellateSegment(
  projector: PanelCoordProjector,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  row: number,
  semanticIndex: number,
  out: number[],
  rows: number[],
  anchors: number[],
  indices: number[],
  budget: { remaining: number; capped: boolean },
  depth = 0,
): void {
  const [px0, py0] = projectPoint(projector, width, height, x0, y0);
  const [px1, py1] = projectPoint(projector, width, height, x1, y1);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const [pmx, pmy] = projectPoint(projector, width, height, mx, my);
  const error = segmentDistance(pmx, pmy, px0, py0, px1, py1);
  if (
    depth < MAX_COORD_TESSELLATION_DEPTH &&
    error > COORD_TESSELLATION_TOLERANCE_PX &&
    budget.remaining > 1
  ) {
    tessellateSegment(
      projector,
      width,
      height,
      x0,
      y0,
      mx,
      my,
      row,
      semanticIndex,
      out,
      rows,
      anchors,
      indices,
      budget,
      depth + 1,
    );
    tessellateSegment(
      projector,
      width,
      height,
      mx,
      my,
      x1,
      y1,
      row,
      semanticIndex,
      out,
      rows,
      anchors,
      indices,
      budget,
      depth + 1,
    );
    return;
  }
  if (
    error > COORD_TESSELLATION_TOLERANCE_PX &&
    (budget.remaining <= 1 || depth >= MAX_COORD_TESSELLATION_DEPTH)
  )
    budget.capped = true;
  if (budget.remaining <= 0) return;
  out.push(px1, py1);
  rows.push(row);
  anchors.push(0);
  indices.push(semanticIndex);
  budget.remaining--;
}

function expandedStepVertices(
  positions: ArrayLike<number>,
  rows: Uint32Array,
  start: number,
  end: number,
): { positions: number[]; rows: number[]; anchors: number[]; indices: number[] } {
  if (end <= start) return { positions: [], rows: [], anchors: [], indices: [] };
  const p = [positions[start * 2]!, positions[start * 2 + 1]!];
  const r = [rows[start] ?? 0xffffffff];
  const a = [1];
  const indices = [start];
  for (let i = start + 1; i < end; i++) {
    const priorX = positions[(i - 1) * 2]!;
    const priorY = positions[(i - 1) * 2 + 1]!;
    const x = positions[i * 2]!;
    const y = positions[i * 2 + 1]!;
    const mid = (priorX + x) / 2;
    p.push(mid, priorY, mid, y, x, y);
    r.push(rows[i - 1] ?? 0xffffffff, rows[i] ?? 0xffffffff, rows[i] ?? 0xffffffff);
    a.push(0, 0, 1);
    indices.push(i - 1, i, i);
  }
  return { positions: p, rows: r, anchors: a, indices };
}

function projectPathBatch(
  batch: PathsBatch,
  projector: PanelCoordProjector,
  width: number,
  height: number,
  warnings: PipelineWarning[],
  sharedBudget?: CoordTessellationBudget,
): void {
  const projected: number[] = [];
  const rows: number[] = [];
  const semanticAnchors: number[] = [];
  const semanticIndices: number[] = [];
  const offsets: number[] = [0];
  const strokes: (string | null)[] = [];
  const fills: (string | null)[] | undefined = batch.fills === undefined ? undefined : [];
  let panelExtraRemaining =
    sharedBudget?.extraRemaining ??
    Math.max(0, MAX_COORD_VERTICES_PER_PANEL_LAYER - batch.positions.length / 2);
  let capped =
    (sharedBudget?.mandatoryVertices ?? batch.positions.length / 2) >
    MAX_COORD_VERTICES_PER_PANEL_LAYER;
  let invalidVertices = 0;
  // Path-like geoms are intentionally built in ordinary scale space so this
  // post-stat stage can split coordinate-invalid runs before projection.
  const unprojected = Float64Array.from(batch.positions);
  const projectable = new Uint8Array(batch.positions.length / 2);
  for (let vertex = 0; vertex < projectable.length; vertex++) {
    const [x, y] = projectPoint(
      projector,
      width,
      height,
      unprojected[vertex * 2]!,
      unprojected[vertex * 2 + 1]!,
    );
    if (Number.isFinite(x) && Number.isFinite(y)) projectable[vertex] = 1;
    else invalidVertices++;
  }

  for (let s = 0; s + 1 < batch.pathOffsets.length; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    let runStart = start;
    while (runStart < end) {
      while (runStart < end && projectable[runStart] === 0) runStart++;
      if (runStart >= end) break;
      let runEnd = runStart + 1;
      while (runEnd < end && projectable[runEnd] === 1) runEnd++;

      const source =
        batch.curve === "step"
          ? expandedStepVertices(unprojected, batch.rowIndex, runStart, runEnd)
          : {
              positions: Array.from(unprojected.slice(runStart * 2, runEnd * 2)),
              rows: Array.from(batch.rowIndex.slice(runStart, runEnd)),
              anchors: Array.from({ length: runEnd - runStart }, () => 1),
              indices: Array.from({ length: runEnd - runStart }, (_, index) => runStart + index),
            };
      const count = source.rows.length;
      const mandatoryStepCorners = Math.max(0, count - (runEnd - runStart));
      if (mandatoryStepCorners > panelExtraRemaining) capped = true;
      panelExtraRemaining = Math.max(0, panelExtraRemaining - mandatoryStepCorners);
      const [firstX, firstY] = projectPoint(
        projector,
        width,
        height,
        source.positions[0]!,
        source.positions[1]!,
      );
      projected.push(firstX, firstY);
      rows.push(source.rows[0]!);
      semanticAnchors.push(source.anchors[0]!);
      semanticIndices.push(source.indices[0]!);
      let subpathExtraRemaining = Math.max(0, MAX_COORD_VERTICES_PER_SUBPATH - count);
      if (count > MAX_COORD_VERTICES_PER_SUBPATH) capped = true;
      for (let i = 1; i < count; i++) {
        const allowance = Math.min(subpathExtraRemaining, panelExtraRemaining);
        const segmentBudget = { remaining: 1 + allowance, capped: false };
        const before = projected.length / 2;
        tessellateSegment(
          projector,
          width,
          height,
          source.positions[(i - 1) * 2]!,
          source.positions[(i - 1) * 2 + 1]!,
          source.positions[i * 2]!,
          source.positions[i * 2 + 1]!,
          source.rows[i]!,
          source.indices[i]!,
          projected,
          rows,
          semanticAnchors,
          semanticIndices,
          segmentBudget,
        );
        const added = projected.length / 2 - before;
        const extraUsed = Math.max(0, added - 1);
        subpathExtraRemaining -= extraUsed;
        panelExtraRemaining -= extraUsed;
        capped ||= segmentBudget.capped;
        // The recursion marks its endpoint synthetic; the authored/stat vertex
        // remains a semantic anchor even when midpoint vertices precede it.
        if (added > 0) semanticAnchors[semanticAnchors.length - 1] = source.anchors[i]!;
      }
      offsets.push(projected.length / 2);
      strokes.push(batch.strokes[s] ?? null);
      fills?.push(batch.fills?.[s] ?? null);
      runStart = runEnd + 1;
    }
  }

  if (sharedBudget !== undefined) sharedBudget.extraRemaining = panelExtraRemaining;
  batch.positions = Float32Array.from(projected);
  batch.rowIndex = Uint32Array.from(rows);
  batch.pathOffsets = Uint32Array.from(offsets);
  batch.strokes = strokes;
  if (fills !== undefined) batch.fills = fills;
  batch.semanticAnchors = Uint8Array.from(semanticAnchors);
  batch.semanticIndex = Uint32Array.from(semanticIndices);
  if (invalidVertices > 0) {
    warnings.push({
      code: "coord-invalid-geometry",
      message:
        `Removed ${invalidVertices} path vertex/vertices outside the coordinate transform domain ` +
        `(layer ${batch.layerIndex}); disconnected finite runs remain separate.`,
    });
  }
  // Step corners were expanded explicitly before projection; renderer-side
  // step interpolation would otherwise create unprojected synthetic corners.
  if (batch.curve === "step") batch.curve = "linear";
  if (capped) {
    warnings.push({
      code: "coord-tessellation-cap",
      message:
        `Coordinate tessellation reached its deterministic vertex cap on layer ${batch.layerIndex}; ` +
        "rendered topology remains bounded. Increase panel resolution only if the approximation is visibly coarse.",
    });
  }
}

/** Project one completed geometry batch after stats, positions, and scale training. */
export function projectGeometryBatch(
  batch: GeometryBatch,
  projector: PanelCoordProjector,
  width: number,
  height: number,
  warnings: PipelineWarning[],
  sharedBudget?: CoordTessellationBudget,
): void {
  if (!projector.x.active && !projector.y.active) return;
  if (batch.kind === "paths") {
    projectPathBatch(batch, projector, width, height, warnings, sharedBudget);
    return;
  }
  if (batch.kind === "points" || batch.kind === "glyphs" || batch.kind === "rects") return;
  if (batch.kind === "segments") {
    const renderPositions: number[] = [];
    const renderPathOffsets: number[] = [0];
    const anchorPositions: number[] = [];
    let capped = false;
    for (let i = 0; i < batch.segments.length; i += 4) {
      const [sourceX1, sourceY1] = unprojectPoint(
        projector,
        width,
        height,
        batch.segments[i]!,
        batch.segments[i + 1]!,
      );
      const [sourceX2, sourceY2] = unprojectPoint(
        projector,
        width,
        height,
        batch.segments[i + 2]!,
        batch.segments[i + 3]!,
      );
      const [x1, y1] = projectPoint(projector, width, height, sourceX1, sourceY1);
      const [x2, y2] = projectPoint(projector, width, height, sourceX2, sourceY2);
      const [anchorX, anchorY] = projectPoint(
        projector,
        width,
        height,
        (sourceX1 + sourceX2) / 2,
        (sourceY1 + sourceY2) / 2,
      );
      batch.segments[i] = x1;
      batch.segments[i + 1] = y1;
      batch.segments[i + 2] = x2;
      batch.segments[i + 3] = y2;
      anchorPositions.push(anchorX, anchorY);
      renderPositions.push(x1, y1);
      const extraAvailable = Math.min(
        MAX_COORD_VERTICES_PER_SUBPATH - 2,
        sharedBudget?.extraRemaining ?? MAX_COORD_VERTICES_PER_SUBPATH - 2,
      );
      const budget = { remaining: 1 + extraAvailable, capped: false };
      const before = renderPositions.length / 2;
      tessellateSegment(
        projector,
        width,
        height,
        sourceX1,
        sourceY1,
        sourceX2,
        sourceY2,
        batch.rowIndex[i / 4] ?? 0xffffffff,
        i / 4,
        renderPositions,
        [],
        [],
        [],
        budget,
      );
      const extraUsed = Math.max(0, renderPositions.length / 2 - before - 1);
      if (sharedBudget !== undefined) sharedBudget.extraRemaining -= extraUsed;
      capped ||= budget.capped;
      renderPathOffsets.push(renderPositions.length / 2);
    }
    batch.renderPositions = Float32Array.from(renderPositions);
    batch.renderPathOffsets = Uint32Array.from(renderPathOffsets);
    batch.anchorPositions = Float32Array.from(anchorPositions);
    if (capped) {
      warnings.push({
        code: "coord-tessellation-cap",
        message: `Coordinate tessellation reached its deterministic vertex cap on layer ${batch.layerIndex}; rendered segment topology remains bounded.`,
      });
    }
  }
}
