/**
 * Per-row errorbar segment emission (stem + caps).
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

export function emitErrorbarRows(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  wantsColors: boolean;
  halfOf: (row: number) => number;
  segments: number[];
  rowIndex: number[];
  strokes: string[];
}): number {
  const { frame, fx, color, wantsColors, halfOf, segments, rowIndex, strokes } = input;
  const { binding, n } = frame;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.normalize(frame.ymin![row]!);
    const t1 = fx.yScale.normalize(frame.ymax![row]!);
    if (
      Number.isNaN(tx) ||
      t0 === undefined ||
      t1 === undefined ||
      Number.isNaN(t0) ||
      Number.isNaN(t1)
    ) {
      removed++;
      continue;
    }
    const cx = tx * fx.innerWidth;
    const half = halfOf(row) * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    segments.push(cx, y0, cx, y1, cx - half, y0, cx + half, y0, cx - half, y1, cx + half, y1);
    const src = frame.rowIndex[row]!;
    rowIndex.push(src, src, src);
    if (wantsColors && color !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      const c = colorOf(color, value);
      strokes.push(c, c, c);
    }
  }
  return removed;
}
