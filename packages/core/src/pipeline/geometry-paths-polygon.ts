/**
 * Polygon path geometry: closed filled paths in data/row order per group.
 * Unlike line/area, vertices are NOT sorted by x (ggplot2 geom_polygon).
 */
import { layerPaintFromParams, resolveGlow, resolveGradientPaint } from "../mark-paint.js";
import type { PathsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_LINEWIDTH, bucketByGroup, positionOf } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { areaGroupFillOf } from "./geometry-paths-area-fill.js";

function strokeOf(
  frame: LayerFrame,
  color: ResolvedColorScale | null,
  rows: readonly number[],
): string | null {
  const { binding } = frame;
  let stroke: string | null = binding.color.constant;
  if (color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null)) {
    const first = rows[0]!;
    const value =
      frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[first]!;
    stroke = colorOf(color, value);
  }
  return stroke;
}

export function polygonBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  // Data order within each group (bucketByGroup walks rows ascending).
  // Intentionally no sortGroupRowsByX — polygons must keep authored winding.
  const groupRows = bucketByGroup(frame, fx, null, warnings).filter((rows) => rows.length >= 2);
  if (groupRows.length === 0) return null;

  const paint = layerPaintFromParams(binding.layer.params);
  const fillPaintResolved =
    paint.fillPaint === null
      ? undefined
      : resolveGradientPaint(paint.fillPaint, binding.index, "fill");
  const strokePaintResolved =
    paint.strokePaint === null
      ? undefined
      : resolveGradientPaint(paint.strokePaint, binding.index, "stroke");
  const glowResolved = paint.glow === null ? undefined : resolveGlow(paint.glow, binding.index);

  let total = 0;
  for (const rows of groupRows) total += rows.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  // One frame-row id per vertex so coord-projected closed paths resolve
  // tooltips to the correct region (not ribbon 2×N layout; #808/#502).
  const closedFrameRows = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      closedFrameRows[cursor] = row;
      cursor++;
    }
    fills.push(areaGroupFillOf(frame, fill, rows) ?? fillPaintResolved?.fallback ?? null);
    let stroke = strokeOf(frame, color, rows);
    if (stroke === null && strokePaintResolved !== undefined) {
      stroke = strokePaintResolved.fallback;
    }
    strokes.push(stroke);
  }
  pathOffsets[groupRows.length] = cursor;

  // polygon and map (geom_map is polygon-with-join; #808) share this batch.
  const params = (binding.layer.params ?? {}) as {
    alpha?: number;
    linewidth?: number;
  };
  const styleRows = groupRows.map((rows) => rows[0]!);
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
    pathOffsets,
    strokes,
    fills,
    closed: true,
    closedFrameRows,
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
    curve: "linear",
    ...(fillPaintResolved !== undefined && { fillPaint: fillPaintResolved }),
    ...(strokePaintResolved !== undefined && { strokePaint: strokePaintResolved }),
    ...(glowResolved !== undefined && { glow: glowResolved }),
  };
}
