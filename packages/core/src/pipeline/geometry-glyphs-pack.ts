/**
 * Pack glyph buffers into a GlyphsBatch.
 */
import type { GlyphsBatch } from "../scene.js";

import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import type { LayerFrame } from "./types.js";
import { DEFAULT_TEXT_SIZE } from "./geometry-shared.js";

export function packGlyphsBatch(input: {
  frame: LayerFrame;
  positions: number[];
  rowIndex: number[];
  styleRows: number[];
  texts: string[];
  colors: string[];
  wantsColors: boolean;
  styles: ResolvedStyleScales;
  params: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    alpha?: number;
  };
}): GlyphsBatch | null {
  const { frame, positions, rowIndex, styleRows, texts, colors, wantsColors, styles, params } =
    input;
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
    size:
      typeof binding.size.constant === "number"
        ? binding.size.constant
        : (params.size ?? DEFAULT_TEXT_SIZE),
    anchor: params.anchor ?? "middle",
    alpha:
      typeof binding.alpha.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
  };
  const sizes = numericStyleVector(frame, "size", styleRows, styles);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  if (sizes !== undefined) batch.sizes = sizes;
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (wantsColors) batch.colors = colors;
  return batch;
}
