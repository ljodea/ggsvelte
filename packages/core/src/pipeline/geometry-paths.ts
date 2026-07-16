/**
 * Line and area path geometry batch builders.
 */
import type { PathsBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { DEFAULT_LINEWIDTH, bucketByGroup, positionOf, xSortKey } from "./geometry-shared.js";

export function lineBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  const subpaths = bucketByGroup(frame, fx, null, warnings);
  if (subpaths.length === 0) return null;
  const sortKey = xSortKey(frame, fx);
  for (const rows of subpaths) rows.sort((a, b) => sortKey(a) - sortKey(b));

  let total = 0;
  for (const rows of subpaths) total += rows.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(subpaths.length + 1);
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < subpaths.length; s++) {
    pathOffsets[s] = cursor;
    const rows = subpaths[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = positionOf(fx.yScale, frame.yNumeric, null, row);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    let stroke: string | null = binding.color.constant;
    if (color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null)) {
      const first = rows[0]!;
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[first]!;
      stroke = colorOf(color, value);
    }
    strokes.push(stroke);
  }
  pathOffsets[subpaths.length] = cursor;

  const params = binding.layer.geom === "line" ? (binding.layer.params ?? {}) : {};
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    pathOffsets,
    strokes,
    linewidth: params.linewidth ?? DEFAULT_LINEWIDTH,
    alpha: params.alpha ?? 1,
    curve: params.curve ?? "linear",
  };
}

export function areaBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const groupRows = bucketByGroup(frame, fx, frame.ymax, warnings);
  if (groupRows.length === 0) return null;
  const sortKey = xSortKey(frame, fx);
  for (const rows of groupRows) rows.sort((a, b) => sortKey(a) - sortKey(b));

  // Draw later-stacked groups first so the first-seen group paints on top.
  let total = 0;
  for (const rows of groupRows) total += rows.length * 2;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    // Upper edge (ymax), x ascending.
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymax[row]!);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    // Lower edge (ymin), x descending.
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]!;
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymin[row]!);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    let fillColor: string | null = binding.fill.constant;
    if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
      const first = rows[0]!;
      const value =
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[first]!;
      fillColor = colorOf(fill, value);
    }
    fills.push(fillColor);
    strokes.push(null);
  }
  pathOffsets[groupRows.length] = cursor;

  const params: { alpha?: number } =
    binding.layer.geom === "area" || binding.layer.geom === "density"
      ? (binding.layer.params ?? {})
      : {};
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
    linewidth: 0,
    alpha: params.alpha ?? 1,
    curve: "linear",
  };
}
