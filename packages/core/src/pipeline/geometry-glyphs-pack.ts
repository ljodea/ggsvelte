/**
 * Pack preallocated glyph buffers into a GlyphsBatch.
 *
 * Dense path (kept === n): return typed arrays as-is (no copy). Sparse path:
 * compact with slice so full-n scratch can be GC'd.
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
  const { kept, positions, rowIndex, texts, colors } = emitted;
  if (kept === 0) return null;
  const { binding, n } = frame;

  let outPositions: Float32Array;
  let outRows: Uint32Array;
  let outTexts: string[];
  let outColors: string[] | undefined;
  if (kept === n) {
    outPositions = positions;
    outRows = rowIndex;
    outTexts = texts;
    outColors = colors ?? undefined;
  } else {
    outPositions = positions.slice(0, kept * 2);
    outRows = rowIndex.slice(0, kept);
    outTexts = texts.slice(0, kept);
    outColors = colors === null ? undefined : colors.slice(0, kept);
  }

  const batch: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: outPositions,
    rowIndex: outRows,
    texts: outTexts,
    color: binding.color.constant,
    size: params.size ?? DEFAULT_TEXT_SIZE,
    anchor: params.anchor ?? "middle",
    alpha: params.alpha ?? 1,
  };
  if (wantsColors && outColors !== undefined) batch.colors = outColors;
  return batch;
}
