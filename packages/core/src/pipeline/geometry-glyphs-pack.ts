/**
 * Pack glyph buffers into a GlyphsBatch.
 */
import type { GlyphsBatch } from "../scene.js";

import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import type { LayerFrame } from "./types.js";
import { DEFAULT_TEXT_SIZE } from "./geometry-shared.js";
import type { EmittedGlyphs } from "./geometry-glyphs-rows.js";

export function packGlyphsBatch(input: {
  frame: LayerFrame;
  emitted: EmittedGlyphs;
  wantsColors: boolean;
  styles: ResolvedStyleScales;
  params: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    alpha?: number;
  };
}): GlyphsBatch | null {
  const { frame, emitted, wantsColors, styles, params } = input;
  if (emitted.kept === 0) return null;
  const { binding } = frame;
  const batch: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: emitted.positions,
    rowIndex: emitted.rowIndex,
    texts: emitted.texts,
    color: binding.color.constant,
    size:
      typeof binding.size?.constant === "number"
        ? binding.size.constant
        : (params.size ?? DEFAULT_TEXT_SIZE),
    anchor: params.anchor ?? "middle",
    alpha:
      typeof binding.alpha?.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
  };
  const sizes =
    binding.size === undefined
      ? undefined
      : numericStyleVector(frame, "size", emitted.styleRows, styles);
  const alphas =
    binding.alpha === undefined
      ? undefined
      : numericStyleVector(frame, "alpha", emitted.styleRows, styles);
  if (sizes !== undefined) batch.sizes = sizes;
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (wantsColors && emitted.colors !== null) batch.colors = emitted.colors;
  return batch;
}
