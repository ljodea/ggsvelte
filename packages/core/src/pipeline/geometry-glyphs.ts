/**
 * Text / label glyph geometry batch builder.
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
  fill: ResolvedColorScale | null,
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
    padding?: number;
    radius?: number;
    linewidth?: number;
  };
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  const emitted = emitGlyphRows({
    frame,
    fx,
    color,
    wantsColors,
    dx: params.dx ?? 0,
    dy: params.dy ?? 0,
  });
  removedWarning(emitted.removed, binding.index, warnings);
  // geom_label (#792) will share this path when it lands; sf_label ships first.
  const withBox = binding.layer.geom === "sf_label";
  return packGlyphsBatch({
    frame,
    emitted,
    wantsColors,
    styles,
    params,
    withBox,
    fill,
  });
}
