/**
 * Pack glyph buffers into a GlyphsBatch.
 */
import type { GlyphsBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import { DEFAULT_TEXT_SIZE } from "./geometry-shared.js";
import type { EmittedGlyphs } from "./geometry-glyphs-rows.js";

export function packGlyphsBatch(input: {
  frame: LayerFrame;
  emitted: EmittedGlyphs;
  wantsColors: boolean;
  params: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    alpha?: number;
  };
}): GlyphsBatch | null {
  const { frame, emitted, wantsColors, params } = input;
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
    size: params.size ?? DEFAULT_TEXT_SIZE,
    anchor: params.anchor ?? "middle",
    alpha: params.alpha ?? 1,
  };
  if (wantsColors && emitted.colors !== null) batch.colors = emitted.colors;
  return batch;
}
