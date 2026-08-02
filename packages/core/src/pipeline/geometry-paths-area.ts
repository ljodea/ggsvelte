/**
 * Area/density path geometry batch builder (closed ribbons).
 */
import { layerPaintFromParams, resolveGlow, resolveGradientPaint } from "../mark-paint.js";
import type { PathsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { constantStyle, numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import { bucketByGroup, sortGroupRowsByX, warnSingleObservationGroups } from "./geometry-shared.js";
import { writeClosedPathGroups } from "./geometry-paths-closed-batch.js";
import { areaGroupFillsOf } from "./geometry-paths-area-fill.js";

export function areaBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const groupRows = bucketByGroup(frame, fx, frame.ymax, warnings);
  if (groupRows.length === 0) return null;
  warnSingleObservationGroups(groupRows, frame, warnings);
  sortGroupRowsByX(groupRows, frame, fx);

  const paint = layerPaintFromParams(binding.layer.params);
  const fillPaintResolved =
    paint.fillPaint === null
      ? undefined
      : resolveGradientPaint(paint.fillPaint, binding.index, "fill");
  const glowResolved = paint.glow === null ? undefined : resolveGlow(paint.glow, binding.index);

  // One fill paint vector for all groups (#1309).
  const styleRows = groupRows.map((rows) => rows[0]!);
  const fillPaints = areaGroupFillsOf(frame, fill, styleRows);

  // Draw later-stacked groups first so the first-seen group paints on top.
  const { positions, rowIndex, closedFrameRows, pathOffsets, fills, strokes } =
    writeClosedPathGroups({
      frame,
      fx,
      groupRows,
      yTop: frame.ymax,
      yBottom: frame.ymin,
      fillOf: (_rows, index) => fillPaints[index] ?? fillPaintResolved?.fallback ?? null,
    });

  const params: { alpha?: number } =
    binding.layer.geom === "area" || binding.layer.geom === "density"
      ? (binding.layer.params ?? {})
      : {};
  const mappedAlphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const subpathCount = pathOffsets.length - 1;
  const constantAlpha = constantStyle(binding, params, "alpha", 1);
  // Multi-group closed fills must carry alpha per subpath. SVG group opacity
  // composites opaque siblings into an offscreen buffer first, so a shared
  // <g opacity> would occlude the rear distribution in the overlap region.
  const alphas =
    mappedAlphas ??
    (subpathCount > 1 && constantAlpha !== 1
      ? Float32Array.from({ length: subpathCount }, () => constantAlpha)
      : undefined);
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    closedFrameRows,
    pathOffsets,
    strokes,
    fills,
    closed: true,
    linewidth: 0,
    alpha: alphas === undefined ? constantAlpha : 1,
    ...(alphas !== undefined && { alphas }),
    curve: "linear",
    ...(fillPaintResolved !== undefined && { fillPaint: fillPaintResolved }),
    ...(glowResolved !== undefined && { glow: glowResolved }),
  };
}
