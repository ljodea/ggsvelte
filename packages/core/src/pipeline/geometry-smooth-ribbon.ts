/**
 * Smooth confidence ribbon (closed path under the fitted line).
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";
import { groupColor, SMOOTH_RIBBON_ALPHA } from "./geometry-smooth-shared.js";

export function buildSmoothRibbonBatch(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  groupRows: readonly (readonly number[])[];
}): GeometryBatch | null {
  const { frame, fx, color, fill, groupRows } = input;
  const { binding } = frame;
  if (!frame.smoothBand || frame.ymin === null || frame.ymax === null) return null;

  const bandRows = groupRows
    .map((rows) =>
      rows.filter(
        (row) => Number.isFinite(frame.ymin![row]!) && Number.isFinite(frame.ymax![row]!),
      ),
    )
    .filter((rows) => rows.length > 1);
  if (bandRows.length === 0) return null;

  let total = 0;
  for (const rows of bandRows) total += rows.length * 2;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(bandRows.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < bandRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = bandRows[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymax[row]!);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]!;
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymin[row]!);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    const first = rows[0]!;
    // Ribbon tint: fill channel, else the line's color (band matches
    // its line in multi-series smooths), else theme accent.
    const ribbonFill =
      groupColor(fill, frame.fillValues, binding.fill.scaledConstant, first) ??
      binding.fill.constant ??
      groupColor(color, frame.colorValues, binding.color.scaledConstant, first) ??
      binding.color.constant;
    fills.push(ribbonFill);
    strokes.push(null);
  }
  pathOffsets[bandRows.length] = cursor;
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
    alpha: SMOOTH_RIBBON_ALPHA,
    curve: "linear",
  };
}
