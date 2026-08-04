/**
 * Write sorted line subpaths into path buffers.
 */
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf, removedWarning } from "./geometry-shared.js";
import { paintVector } from "./geometry-style.js";

export function writeLineSubpaths(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  subpaths: readonly (readonly number[])[];
  includeFrameRows?: boolean;
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  frameRowIndex?: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
} {
  const { frame, fx, color, subpaths, includeFrameRows = false } = input;

  let total = 0;
  for (const rows of subpaths) total += rows.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const frameRowIndex = includeFrameRows ? new Uint32Array(total) : undefined;
  const pathOffsets = new Uint32Array(subpaths.length + 1);
  const styleRows = new Uint32Array(subpaths.length);
  let cursor = 0;

  // Continuous multi-series: monomorphic normalize + pixel map (no band/offset branch).
  const xNum = frame.xNumeric;
  const yNum = frame.yNumeric;
  if (fx.xScale.type !== "band" && fx.yScale.type !== "band" && xNum !== null && yNum !== null) {
    // PositionScale is ContinuousScale | BandScale; type guard above excludes band.
    const xScale = fx.xScale;
    const yScale = fx.yScale;
    const iw = fx.innerWidth;
    const ih = fx.innerHeight;
    const sourceRows = frame.rowIndex;
    for (let s = 0; s < subpaths.length; s++) {
      pathOffsets[s] = cursor;
      const rows = subpaths[s]!;
      styleRows[s] = rows[0]!;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const tx = xScale.normalizeTransformed(xNum[row]!);
        const ty = yScale.normalizeTransformed(yNum[row]!);
        positions[cursor * 2] = tx * iw;
        positions[cursor * 2 + 1] = ih - ty * ih;
        rowIndex[cursor] = sourceRows[row]!;
        if (frameRowIndex !== undefined) frameRowIndex[cursor] = row;
        cursor++;
      }
    }
  } else {
    for (let s = 0; s < subpaths.length; s++) {
      pathOffsets[s] = cursor;
      const rows = subpaths[s]!;
      styleRows[s] = rows[0]!;
      for (const row of rows) {
        const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
        const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
        positions[cursor * 2] = tx * fx.innerWidth;
        positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
        rowIndex[cursor] = frame.rowIndex[row]!;
        if (frameRowIndex !== undefined) frameRowIndex[cursor] = row;
        cursor++;
      }
    }
  }
  pathOffsets[subpaths.length] = cursor;
  // One paint vector for all subpath representative rows (#1309).
  const strokes = paintVector(frame, "color", color, styleRows);
  return {
    positions,
    rowIndex,
    ...(frameRowIndex !== undefined && { frameRowIndex }),
    pathOffsets,
    strokes,
  };
}

/**
 * Continuous multi-series line: single normalize+pixel pass that also builds
 * group buckets (replaces bucketByGroup + writeLineSubpaths when no per-vertex
 * style split applies). Stores pixel coords on the first normalize so write
 * never re-maps the same vertices.
 *
 * Returns null when every row is dropped, or when the scale/data shape is not
 * continuous (caller falls back to the two-step path).
 */
export function writeContinuousLineOnePass(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  warnings: PipelineWarning[];
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
  /** Non-empty group row lists (for single-observation warnings / x-sort). */
  groupRows: number[][];
} | null {
  const { frame, fx, color, warnings } = input;
  const xNum = frame.xNumeric;
  const yNum = frame.yNumeric;
  if (fx.xScale.type === "band" || fx.yScale.type === "band" || xNum === null || yNum === null) {
    return null;
  }
  const xScale = fx.xScale;
  const yScale = fx.yScale;
  const iw = fx.innerWidth;
  const ih = fx.innerHeight;
  const sourceRows = frame.rowIndex;
  const groups = frame.groups;
  const n = frame.n;

  let maxG = -1;
  for (let row = 0; row < n; row++) {
    const g = groups[row]!;
    if (g > maxG) maxG = g;
  }
  if (maxG < 0) return null;

  // Growable per-group buffers (row indices + pixel pairs). Competitive
  // multi-series has few groups (3) so Array push is fine.
  const keptRows: number[][] = Array.from({ length: maxG + 1 }, () => []);
  const keptPx: number[][] = Array.from({ length: maxG + 1 }, () => []);
  let removed = 0;
  let kept = 0;
  for (let row = 0; row < n; row++) {
    const xv = xNum[row]!;
    const yv = yNum[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
      removed++;
      continue;
    }
    const tx = xScale.normalizeTransformed(xv);
    const ty = yScale.normalizeTransformed(yv);
    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      removed++;
      continue;
    }
    const g = groups[row]!;
    keptRows[g]!.push(row);
    keptPx[g]!.push(tx * iw, ih - ty * ih);
    kept++;
  }
  removedWarning(removed, frame.binding.index, warnings);
  if (kept === 0) return null;

  const nonEmpty: number[] = [];
  for (let g = 0; g <= maxG; g++) {
    if (keptRows[g]!.length > 0) nonEmpty.push(g);
  }
  const pathOffsets = new Uint32Array(nonEmpty.length + 1);
  const positions = new Float32Array(kept * 2);
  const rowIndex = new Uint32Array(kept);
  const styleRows = new Uint32Array(nonEmpty.length);
  const groupRows: number[][] = [];
  let cursor = 0;
  for (let s = 0; s < nonEmpty.length; s++) {
    const g = nonEmpty[s]!;
    const rows = keptRows[g]!;
    const px = keptPx[g]!;
    pathOffsets[s] = cursor;
    styleRows[s] = rows[0]!;
    groupRows.push(rows);
    for (let i = 0; i < rows.length; i++) {
      positions[cursor * 2] = px[i * 2]!;
      positions[cursor * 2 + 1] = px[i * 2 + 1]!;
      rowIndex[cursor] = sourceRows[rows[i]!]!;
      cursor++;
    }
  }
  pathOffsets[nonEmpty.length] = cursor;
  const strokes = paintVector(frame, "color", color, styleRows);
  return { positions, rowIndex, pathOffsets, strokes, groupRows };
}
