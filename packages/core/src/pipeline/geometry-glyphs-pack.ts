/**
 * Pack glyph buffers into a GlyphsBatch.
 */
import type { GlyphsBatch } from "../scene.js";
import { FONT_METRICS } from "../layout/font-metrics.js";
import { MetricsTableMeasurer } from "../layout/measure.js";

import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import { DEFAULT_TEXT_SIZE } from "./geometry-shared.js";
import type { EmittedGlyphs } from "./geometry-glyphs-rows.js";

const DEFAULT_LABEL_PADDING = 3;
const DEFAULT_LABEL_RADIUS = 3;
const DEFAULT_LABEL_STROKE_WIDTH = 0.5;

const measurer = new MetricsTableMeasurer(FONT_METRICS);

export function packGlyphsBatch(input: {
  frame: LayerFrame;
  emitted: EmittedGlyphs;
  wantsColors: boolean;
  styles: ResolvedStyleScales;
  params: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    alpha?: number;
    padding?: number;
    radius?: number;
    linewidth?: number;
  };
  /** When true, attach label background box fields (geom_label / geom_sf_label). */
  withBox?: boolean;
  fill?: ResolvedColorScale | null;
}): GlyphsBatch | null {
  const { frame, emitted, wantsColors, styles, params, withBox = false, fill = null } = input;
  if (emitted.kept === 0) return null;
  const { binding } = frame;
  const fontSize =
    typeof binding.size?.constant === "number"
      ? binding.size.constant
      : (params.size ?? DEFAULT_TEXT_SIZE);
  const batch: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: emitted.positions,
    rowIndex: emitted.rowIndex,
    texts: emitted.texts,
    color: binding.color.constant,
    size: fontSize,
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

  if (withBox) {
    const padding = params.padding ?? DEFAULT_LABEL_PADDING;
    const radius = params.radius ?? DEFAULT_LABEL_RADIUS;
    const strokeWidth = params.linewidth ?? DEFAULT_LABEL_STROKE_WIDTH;
    const boxWidths = new Float32Array(emitted.kept);
    const boxHeights = new Float32Array(emitted.kept);
    for (let j = 0; j < emitted.kept; j++) {
      const sz = sizes?.[j] ?? fontSize;
      const text = emitted.texts[j]!;
      boxWidths[j] = measurer.measureWidth(text, sz) + 2 * padding;
      boxHeights[j] = measurer.measureHeight(sz) + 2 * padding;
    }
    batch.boxWidths = boxWidths;
    batch.boxHeights = boxHeights;
    batch.boxPadding = padding;
    batch.boxRadius = radius;
    batch.boxStrokeWidth = strokeWidth;
    // Outline follows text color (ggplot2: colour is ink + border).
    batch.boxStroke = binding.color.constant;
    if (wantsColors && emitted.colors !== null) batch.boxStrokes = emitted.colors;

    const wantsFills =
      fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null);
    if (wantsFills && fill !== null) {
      const fills = Array.from<string>({ length: emitted.kept });
      for (let j = 0; j < emitted.kept; j++) {
        const row = emitted.styleRows[j]!;
        const value =
          frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!;
        fills[j] = colorOf(fill, value);
      }
      batch.boxFills = fills;
      batch.boxFill = null;
    } else {
      // Constant fill from binding, else theme paper at render time (null).
      batch.boxFill = binding.fill.constant;
    }
  }

  return batch;
}
