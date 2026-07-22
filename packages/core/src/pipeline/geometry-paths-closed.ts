/**
 * Shared closed-band path edges: upper ascending, lower descending.
 * Used by area/density ribbons and smooth confidence bands.
 */
import type { LayerFrame } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

/**
 * Append upper-then-reversed-lower vertices for one closed band subpath.
 * Returns the advanced cursor.
 */
export function appendClosedBandEdges(input: {
  positions: Float32Array;
  rowIndex: Uint32Array;
  /** Optional parallel frame-row ids (same length as rowIndex / vertex count). */
  closedFrameRows?: Uint32Array;
  cursor: number;
  rows: readonly number[];
  frame: LayerFrame;
  fx: Frame;
  yTop: Float64Array;
  yBottom: Float64Array;
}): number {
  const { positions, rowIndex, closedFrameRows, rows, frame, fx, yTop, yBottom } = input;
  let cursor = input.cursor;

  for (const row of rows) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(yTop[row]!);
    positions[cursor * 2] = tx * fx.innerWidth;
    positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
    rowIndex[cursor] = frame.rowIndex[row]!;
    if (closedFrameRows !== undefined) closedFrameRows[cursor] = row;
    cursor++;
  }
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(yBottom[row]!);
    positions[cursor * 2] = tx * fx.innerWidth;
    positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
    rowIndex[cursor] = frame.rowIndex[row]!;
    if (closedFrameRows !== undefined) closedFrameRows[cursor] = row;
    cursor++;
  }
  return cursor;
}
