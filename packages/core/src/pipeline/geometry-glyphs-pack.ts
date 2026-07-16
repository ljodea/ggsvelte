/**
 * Pack glyph buffers into a GlyphsBatch.
 */
import type { GlyphsBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import { DEFAULT_TEXT_SIZE } from "./geometry-shared.js";

export function packGlyphsBatch(input: {
  frame: LayerFrame;
  positions: number[];
  rowIndex: number[];
  texts: string[];
  colors: string[];
  wantsColors: boolean;
  params: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    alpha?: number;
  };
}): GlyphsBatch | null {
  const { frame, positions, rowIndex, texts, colors, wantsColors, params } = input;
  if (texts.length === 0) return null;
  const { binding } = frame;
  const batch: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: Float32Array.from(positions),
    rowIndex: Uint32Array.from(rowIndex),
    texts,
    color: binding.color.constant,
    size: params.size ?? DEFAULT_TEXT_SIZE,
    anchor: params.anchor ?? "middle",
    alpha: params.alpha ?? 1,
  };
  if (wantsColors) batch.colors = colors;
  return batch;
}
