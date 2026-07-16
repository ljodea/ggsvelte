/**
 * Write smooth fitted-line vertices into typed arrays.
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";
import { groupColor } from "./geometry-smooth-shared.js";

export function writeSmoothLineGeometry(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  groupRows: readonly (readonly number[])[];
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
} {
  const { frame, fx, color, groupRows } = input;
  const { binding } = frame;

  let total = 0;
  for (const rows of groupRows) total += rows.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = positionOf(fx.yScale, frame.yNumeric, null, row);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    strokes.push(
      groupColor(color, frame.colorValues, binding.color.scaledConstant, rows[0]!) ??
        binding.color.constant,
    );
  }
  pathOffsets[groupRows.length] = cursor;
  return { positions, rowIndex, pathOffsets, strokes };
}
