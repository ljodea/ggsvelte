/**
 * Write sorted line subpaths into path buffers.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";
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
