/**
 * Allocate and fill multi-group closed path buffers with per-group fills.
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { appendClosedBandEdges } from "./geometry-paths-closed.js";

export function writeClosedPathGroups(input: {
  frame: LayerFrame;
  fx: Frame;
  groupRows: readonly (readonly number[])[];
  yTop: Float64Array;
  yBottom: Float64Array;
  fillOf: (rows: readonly number[]) => string | null;
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  closedFrameRows: Uint32Array;
  pathOffsets: Uint32Array;
  fills: (string | null)[];
  strokes: (string | null)[];
} {
  const { frame, fx, groupRows, yTop, yBottom, fillOf } = input;
  let total = 0;
  for (const rows of groupRows) total += rows.length * 2;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const closedFrameRows = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    cursor = appendClosedBandEdges({
      positions,
      rowIndex,
      closedFrameRows,
      cursor,
      rows,
      frame,
      fx,
      yTop,
      yBottom,
    });
    fills.push(fillOf(rows));
    strokes.push(null);
  }
  pathOffsets[groupRows.length] = cursor;
  return { positions, rowIndex, closedFrameRows, pathOffsets, fills, strokes };
}
