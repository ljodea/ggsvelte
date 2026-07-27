import type { PanelCoordProjector } from "../coord-projector.js";
import type { PathsBatch } from "../scene.js";

import type { PipelineWarning } from "./types.js";
import {
  MAX_COORD_VERTICES_PER_PANEL_LAYER,
  MAX_COORD_VERTICES_PER_SUBPATH,
  projectPoint,
  tessellateSegment,
  type CoordTessellationBudget,
} from "./coord-tessellation.js";

function indexRange(start: number, end: number): number[] {
  const values = Array.from({ length: Math.max(0, end - start) }, () => 0);
  for (let index = 0; index < values.length; index++) values[index] = start + index;
  return values;
}

function expandedStepVertices(
  positions: ArrayLike<number>,
  rows: Uint32Array,
  start: number,
  end: number,
  maxSyntheticVertices: number,
): { positions: number[]; rows: number[]; anchors: number[]; indices: number[] } {
  if (end <= start) return { positions: [], rows: [], anchors: [], indices: [] };
  const p = [positions[start * 2]!, positions[start * 2 + 1]!];
  const r = [rows[start] ?? 0xffffffff];
  const a = [1];
  const indices = [start];
  let syntheticVertices = 0;
  for (let i = start + 1; i < end; i++) {
    const priorX = positions[(i - 1) * 2]!;
    const priorY = positions[(i - 1) * 2 + 1]!;
    const x = positions[i * 2]!;
    const y = positions[i * 2 + 1]!;
    const mid = (priorX + x) / 2;
    if (syntheticVertices < maxSyntheticVertices) {
      p.push(mid, priorY);
      r.push(rows[i - 1] ?? 0xffffffff);
      a.push(0);
      indices.push(i - 1);
      syntheticVertices++;
    }
    if (syntheticVertices < maxSyntheticVertices) {
      p.push(mid, y);
      r.push(rows[i] ?? 0xffffffff);
      a.push(0);
      indices.push(i);
      syntheticVertices++;
    }
    p.push(x, y);
    r.push(rows[i] ?? 0xffffffff);
    a.push(1);
    indices.push(i);
  }
  return { positions: p, rows: r, anchors: a, indices };
}

export function projectPathBatch(
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
  const linewidths: number[] | undefined = batch.linewidths === undefined ? undefined : [];
  const alphas: number[] | undefined = batch.alphas === undefined ? undefined : [];
  const linetypeIndexes: number[] | undefined =
    batch.linetypeIndexes === undefined ? undefined : [];
  let panelExtraRemaining =
    sharedBudget?.extraRemaining ??
    Math.max(0, MAX_COORD_VERTICES_PER_PANEL_LAYER - batch.positions.length / 2);
  let capped =
    (sharedBudget?.mandatoryVertices ?? batch.positions.length / 2) >
    MAX_COORD_VERTICES_PER_PANEL_LAYER;
  let invalidVertices = 0;
  let droppedFilledSubpaths = 0;
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
  // Invalid vertices never become mandatory rendered anchors; free their
  // reserved slots without exceeding max(0, cap − validMandatory).
  if (invalidVertices > 0) {
    const totalMandatory = sharedBudget?.mandatoryVertices ?? batch.positions.length / 2;
    const validMandatory = Math.max(0, totalMandatory - invalidVertices);
    const allowedExtra = Math.max(0, MAX_COORD_VERTICES_PER_PANEL_LAYER - validMandatory);
    panelExtraRemaining = Math.min(panelExtraRemaining + invalidVertices, allowedExtra);
    if (sharedBudget !== undefined) {
      sharedBudget.mandatoryVertices = validMandatory;
      sharedBudget.extraRemaining = Math.min(
        sharedBudget.extraRemaining + invalidVertices,
        allowedExtra,
      );
    }
    capped = validMandatory > MAX_COORD_VERTICES_PER_PANEL_LAYER;
  }

  /**
   * Project a half-open source vertex range [runStart, runEnd) into `projected`.
   * Returns false when the range is empty.
   *
   * Per-ring subpath vertex budget: each call resets subpathExtraRemaining, so
   * an N-ring compound can use up to N × MAX_COORD_VERTICES_PER_SUBPATH of
   * tessellation budget (panel cap still shared via panelExtraRemaining).
   */
  const projectRun = (runStart: number, runEnd: number): boolean => {
    if (runEnd <= runStart) return false;
    const authoredCount = runEnd - runStart;
    const desiredStepCorners = batch.curve === "step" ? Math.max(0, 2 * (authoredCount - 1)) : 0;
    const stepCornerAllowance = Math.min(
      panelExtraRemaining,
      Math.max(0, MAX_COORD_VERTICES_PER_SUBPATH - authoredCount),
    );
    const source =
      batch.curve === "step"
        ? expandedStepVertices(unprojected, batch.rowIndex, runStart, runEnd, stepCornerAllowance)
        : {
            positions: Array.from(unprojected.slice(runStart * 2, runEnd * 2)),
            rows: Array.from(batch.rowIndex.slice(runStart, runEnd)),
            anchors: Array.from({ length: authoredCount }, () => 1),
            indices: indexRange(runStart, runEnd),
          };
    const count = source.rows.length;
    if (count === 0) return false;
    const emittedStepCorners = Math.max(0, count - authoredCount);
    if (emittedStepCorners < desiredStepCorners) capped = true;
    panelExtraRemaining -= emittedStepCorners;
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
    return true;
  };

  const sourceRingStarts = batch.ringStarts;
  const remappedRingStarts: number[] = [];

  for (let s = 0; s + 1 < batch.pathOffsets.length; s++) {
    const start = batch.pathOffsets[s]!;
    const end = batch.pathOffsets[s + 1]!;
    let sourceHasInvalidVertex = false;
    for (let vertex = start; vertex < end; vertex++) {
      if (projectable[vertex] === 0) {
        sourceHasInvalidVertex = true;
        break;
      }
    }
    // A partial closed polygon has no valid boundary: SVG and canvas filling
    // implicitly join its finite endpoints with a false chord. Drop that
    // source subpath instead of painting geometry across an invalid gap.
    // Multi-ring compounds drop as a whole (no partial hole remapping).
    if (batch.closed === true && batch.fills !== undefined && sourceHasInvalidVertex) {
      droppedFilledSubpaths++;
      continue;
    }

    // Hole rings (#809 phase 9): project each ring of this compound separately
    // so tessellation never invents an exterior→hole chord, then remap
    // ringStarts to post-projection vertex indices (per-compound interior breaks).
    // Without fills, ringStarts is not remapped (undefined consumers); fall
    // through to run-splitting and clear metadata at the end.
    const holeCompound =
      batch.closed === true &&
      batch.fills !== undefined &&
      sourceRingStarts !== undefined &&
      sourceRingStarts.length > 0;
    if (holeCompound) {
      const cuts: number[] = [start];
      for (let i = 0; i < sourceRingStarts.length; i++) {
        const b = sourceRingStarts[i]!;
        if (b > start && b < end) cuts.push(b);
      }
      cuts.push(end);
      // No interior cuts in this subpath → ordinary single-ring project.
      if (cuts.length === 2) {
        if (!projectRun(start, end)) continue;
        offsets.push(projected.length / 2);
        strokes.push(batch.strokes[s] ?? null);
        fills?.push(batch.fills?.[s] ?? null);
        linewidths?.push(batch.linewidths?.[s] ?? batch.linewidth);
        alphas?.push(batch.alphas?.[s] ?? batch.alpha);
        linetypeIndexes?.push(batch.linetypeIndexes?.[s] ?? 0);
        continue;
      }
      let emittedAny = false;
      for (let c = 0; c + 1 < cuts.length; c++) {
        const rs = cuts[c]!;
        const re = cuts[c + 1]!;
        if (re <= rs) continue;
        // First ring of this compound is not a ringStarts entry; subsequent
        // successful rings record the current projected vertex cursor.
        if (emittedAny) remappedRingStarts.push(projected.length / 2);
        if (projectRun(rs, re)) emittedAny = true;
      }
      if (!emittedAny) continue;
      offsets.push(projected.length / 2);
      strokes.push(batch.strokes[s] ?? null);
      fills?.push(batch.fills?.[s] ?? null);
      linewidths?.push(batch.linewidths?.[s] ?? batch.linewidth);
      alphas?.push(batch.alphas?.[s] ?? batch.alpha);
      linetypeIndexes?.push(batch.linetypeIndexes?.[s] ?? 0);
      continue;
    }

    let runStart = start;
    while (runStart < end) {
      while (runStart < end && projectable[runStart] === 0) runStart++;
      if (runStart >= end) break;
      let runEnd = runStart + 1;
      while (runEnd < end && projectable[runEnd] === 1) runEnd++;
      if (!projectRun(runStart, runEnd)) {
        runStart = runEnd + 1;
        continue;
      }
      offsets.push(projected.length / 2);
      strokes.push(batch.strokes[s] ?? null);
      fills?.push(batch.fills?.[s] ?? null);
      linewidths?.push(batch.linewidths?.[s] ?? batch.linewidth);
      alphas?.push(batch.alphas?.[s] ?? batch.alpha);
      linetypeIndexes?.push(batch.linetypeIndexes?.[s] ?? 0);
      runStart = runEnd + 1;
    }
  }

  if (sharedBudget !== undefined) sharedBudget.extraRemaining = panelExtraRemaining;
  batch.positions = Float32Array.from(projected);
  batch.rowIndex = Uint32Array.from(rows);
  batch.pathOffsets = Uint32Array.from(offsets);
  batch.strokes = strokes;
  if (fills !== undefined) batch.fills = fills;
  if (linewidths !== undefined) batch.linewidths = Float32Array.from(linewidths);
  if (alphas !== undefined) batch.alphas = Float32Array.from(alphas);
  if (linetypeIndexes !== undefined) batch.linetypeIndexes = Uint8Array.from(linetypeIndexes);
  batch.semanticAnchors = Uint8Array.from(semanticAnchors);
  batch.semanticIndex = Uint32Array.from(semanticIndices);
  // Remap even-odd hole topology (#809 phase 9). Dropped compounds omit their
  // ringStarts (no stale indices). Closing edges remain untessellated (paint closePath).
  if (remappedRingStarts.length > 0) {
    batch.ringStarts = Uint32Array.from(remappedRingStarts);
    batch.fillRule = "evenodd";
  } else {
    if (batch.ringStarts !== undefined) delete batch.ringStarts;
    if (batch.fillRule !== undefined) delete batch.fillRule;
  }
  if (invalidVertices > 0) {
    warnings.push({
      code: "coord-invalid-geometry",
      message:
        `Removed ${invalidVertices} path vertex/vertices outside the coordinate transform domain ` +
        `(layer ${batch.layerIndex}); ` +
        (droppedFilledSubpaths > 0
          ? `dropped ${droppedFilledSubpaths} closed filled subpath/subpaths with incomplete boundaries.`
          : "disconnected finite runs remain separate."),
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
