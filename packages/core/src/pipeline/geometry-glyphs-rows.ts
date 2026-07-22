/**
 * Per-row text glyph emission into preallocated typed geometry buffers.
 *
 * Matches geometry-rects-emit / geometry-points-collect: pre-size to frame.n,
 * then compact only when marks were dropped (NaN coords / missing label).
 */
import { bandKey } from "../scales/train.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

export interface EmittedGlyphs {
  positions: Float32Array;
  rowIndex: Uint32Array;
  texts: string[];
  colors: string[] | null;
  kept: number;
  removed: number;
}

export function emitGlyphRows(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  wantsColors: boolean;
  dx: number;
  dy: number;
}): EmittedGlyphs {
  const { frame, fx, color, wantsColors, dx, dy } = input;
  const { binding, n } = frame;
  const positions = new Float32Array(n * 2);
  const rowIndex = new Uint32Array(n);
  const texts = Array.from<string>({ length: n });
  const colors = wantsColors ? Array.from<string>({ length: n }) : null;
  let kept = 0;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row, frame.offsetX);
    const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row, frame.offsetY);
    const label =
      binding.labelConstant ?? (frame.labelValues === null ? null : frame.labelValues[row]);
    if (Number.isNaN(tx) || Number.isNaN(ty) || label === null) {
      removed++;
      continue;
    }
    positions[kept * 2] = tx * fx.innerWidth + dx;
    positions[kept * 2 + 1] = fx.innerHeight - ty * fx.innerHeight + dy;
    rowIndex[kept] = frame.rowIndex[row]!;
    texts[kept] = bandKey(label);
    if (colors !== null && color !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors[kept] = colorOf(color, value);
    }
    kept++;
  }

  if (kept === n) {
    return { positions, rowIndex, texts, colors, kept, removed };
  }
  if (kept === 0) {
    return {
      positions: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      texts: [],
      colors: wantsColors ? [] : null,
      kept: 0,
      removed,
    };
  }
  // Sparse path: compact so full-n scratch can be GC'd.
  return {
    positions: positions.subarray(0, kept * 2).slice(),
    rowIndex: rowIndex.subarray(0, kept).slice(),
    texts: texts.slice(0, kept),
    colors: colors === null ? null : colors.slice(0, kept),
    kept,
    removed,
  };
}
