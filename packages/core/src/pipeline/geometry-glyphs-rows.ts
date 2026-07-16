/**
 * Per-row text glyph emission into mutable geometry buffers.
 */
import { bandKey } from "../scales/train.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

export function emitGlyphRows(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  wantsColors: boolean;
  dx: number;
  dy: number;
  positions: number[];
  rowIndex: number[];
  texts: string[];
  colors: string[];
}): number {
  const { frame, fx, color, wantsColors, dx, dy, positions, rowIndex, texts, colors } = input;
  const { binding, n } = frame;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row, frame.offsetX);
    const ty = positionOf(fx.yScale, frame.yNumeric, null, row, frame.offsetY);
    const label =
      binding.labelConstant ?? (frame.labelValues === null ? null : frame.labelValues[row]);
    if (Number.isNaN(tx) || Number.isNaN(ty) || label === null) {
      removed++;
      continue;
    }
    positions.push(tx * fx.innerWidth + dx, fx.innerHeight - ty * fx.innerHeight + dy);
    rowIndex.push(frame.rowIndex[row]!);
    texts.push(bandKey(label));
    if (wantsColors && color !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors.push(colorOf(color, value));
    }
  }
  return removed;
}
