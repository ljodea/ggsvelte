/**
 * Per-row text glyph emission into preallocated geometry buffers.
 *
 * Pre-allocates Float32Array / Uint32Array / string arrays of length n (like
 * geometry-rects-emit / points-collect) so large geom_text frames avoid
 * dynamic number[] growth + Float32Array.from double-copy.
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
  /** Present only when mapped/scaled colors were requested. */
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
  const colors = wantsColors && color !== null ? Array.from<string>({ length: n }) : null;
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
    const o = kept * 2;
    positions[o] = tx * fx.innerWidth + dx;
    positions[o + 1] = fx.innerHeight - ty * fx.innerHeight + dy;
    rowIndex[kept] = frame.rowIndex[row]!;
    texts[kept] = bandKey(label);
    if (colors !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors[kept] = colorOf(color!, value);
    }
    kept++;
  }
  return { positions, rowIndex, texts, colors, kept, removed };
}
