/**
 * Text glyph geometry batch builder.
 */
import type { GlyphsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_TEXT_SIZE, removedWarning } from "./geometry-shared.js";
import { emitGlyphRows } from "./geometry-glyphs-rows.js";

export function glyphsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GlyphsBatch | null {
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as {
    anchor?: "start" | "middle" | "end";
    size?: number;
    dx?: number;
    dy?: number;
    alpha?: number;
  };
  const positions: number[] = [];
  const rowIndex: number[] = [];
  const texts: string[] = [];
  const colors: string[] = [];
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  const removed = emitGlyphRows({
    frame,
    fx,
    color,
    wantsColors,
    dx: params.dx ?? 0,
    dy: params.dy ?? 0,
    positions,
    rowIndex,
    texts,
    colors,
  });
  removedWarning(removed, binding.index, warnings);
  if (texts.length === 0) return null;

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
