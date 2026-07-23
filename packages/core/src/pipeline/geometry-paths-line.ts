/**
 * Line path geometry batch builder.
 */
import { layerPaintFromParams, resolveGlow, resolveGradientPaint } from "../mark-paint.js";
import type { PathsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { DEFAULT_LINEWIDTH, bucketByGroup, sortGroupRowsByX } from "./geometry-shared.js";
import { writeLineSubpaths } from "./geometry-paths-line-write.js";
import { splitStyleSubpaths } from "./geometry-paths-style-subpaths.js";

export function lineBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  const groupedRows = bucketByGroup(frame, fx, null, warnings);
  if (groupedRows.length === 0) return null;
  sortGroupRowsByX(groupedRows, frame, fx);
  const subpaths = splitStyleSubpaths(frame, groupedRows, styles);
  const styleSplit = subpaths.length > groupedRows.length;

  const paint = layerPaintFromParams(binding.layer.params);
  const strokePaintResolved =
    paint.strokePaint === null
      ? undefined
      : resolveGradientPaint(paint.strokePaint, binding.index, "stroke");
  const glowResolved = paint.glow === null ? undefined : resolveGlow(paint.glow, binding.index);

  const { positions, rowIndex, frameRowIndex, pathOffsets, strokes } = writeLineSubpaths({
    frame,
    fx,
    color,
    subpaths,
    includeFrameRows: styleSplit,
  });

  // Apply strokePaint solid fallback when a stroke is still null/theme-default.
  if (strokePaintResolved !== undefined) {
    for (let i = 0; i < strokes.length; i++) {
      strokes[i] ??= strokePaintResolved.fallback;
    }
  }

  const params = binding.layer.geom === "line" ? (binding.layer.params ?? {}) : {};
  const styleRows = subpaths.map((rows) => rows[0]!);
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linetypeIndexes = indexedStyleVector(frame, "linetype", styleRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  const literalLinewidth = binding.linewidth.constant;
  const literalAlpha = binding.alpha.constant;
  const literalLinetype = binding.linetype.constant;
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    ...(frameRowIndex !== undefined && { frameRowIndex }),
    pathOffsets,
    strokes,
    linewidth:
      typeof literalLinewidth === "number"
        ? literalLinewidth
        : (params.linewidth ?? DEFAULT_LINEWIDTH),
    ...(linewidths !== undefined && { linewidths }),
    alpha:
      alphas === undefined
        ? typeof literalAlpha === "number"
          ? literalAlpha
          : (params.alpha ?? 1)
        : 1,
    ...(alphas !== undefined && { alphas }),
    ...(typeof literalLinetype === "string" && { linetype: literalLinetype as Linetype }),
    ...(linetypeIndexes !== undefined && { linetypeIndexes }),
    curve: params.curve ?? "linear",
    ...(strokePaintResolved !== undefined && { strokePaint: strokePaintResolved }),
    ...(glowResolved !== undefined && { glow: glowResolved }),
  };
}
