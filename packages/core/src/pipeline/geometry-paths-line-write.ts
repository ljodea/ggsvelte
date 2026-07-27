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
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < subpaths.length; s++) {
    pathOffsets[s] = cursor;
    const rows = subpaths[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      if (frameRowIndex !== undefined) frameRowIndex[cursor] = row;
      cursor++;
    }
    strokes.push(paintVector(frame, "color", color, [rows[0]!])[0]!);
  }
  pathOffsets[subpaths.length] = cursor;
  return {
    positions,
    rowIndex,
    ...(frameRowIndex !== undefined && { frameRowIndex }),
    pathOffsets,
    strokes,
  };
}
