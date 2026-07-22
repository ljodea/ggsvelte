/**
 * Text glyph geometry batch builder.
 */
import type { GlyphsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import { removedWarning } from "./geometry-shared.js";
import { packGlyphsBatch } from "./geometry-glyphs-pack.js";
import { emitGlyphRows } from "./geometry-glyphs-rows.js";

export function glyphsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
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
  const styleRows: number[] = [];
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
    styleRows,
    texts,
    colors,
  });
  removedWarning(removed, binding.index, warnings);
  return packGlyphsBatch({
    frame,
    positions,
    rowIndex,
    styleRows,
    texts,
    colors,
    wantsColors,
    styles,
    params,
  });
}
