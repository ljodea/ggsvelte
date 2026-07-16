/**
 * Smooth geometry: optional confidence ribbon plus fitted line.
 */
import type { SmoothParams } from "@ggsvelte/spec";

import type { GeometryBatch } from "../scene.js";
import type { CellValue } from "../table.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { bucketByGroup, positionOf, xSortKey } from "./geometry-shared.js";

const DEFAULT_SMOOTH_LINEWIDTH = 1;
/** Ribbon fill opacity (ggplot2 uses 0.4 on grey60; 0.3 reads better over
 *  theme-accent fills — decision 0010). */
const SMOOTH_RIBBON_ALPHA = 0.3;

/** Per-subpath color resolution for grouped batches (first row decides). */
function groupColor(
  resolved: ResolvedColorScale | null,
  values: readonly CellValue[] | null,
  scaledConstant: CellValue | null,
  firstRow: number,
): string | null {
  if (resolved === null || (values === null && scaledConstant === null)) return null;
  const value = values === null ? scaledConstant! : values[firstRow]!;
  return colorOf(resolved, value);
}

export function smoothBatches(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as SmoothParams;
  const groupRows = bucketByGroup(frame, fx, null, warnings);
  if (groupRows.length === 0) return [];
  const sortKey = xSortKey(frame, fx);
  for (const rows of groupRows) rows.sort((a, b) => sortKey(a) - sortKey(b));
  const out: GeometryBatch[] = [];

  // --- ribbon (drawn first, under the line) -----------------------------------
  if (frame.smoothBand && frame.ymin !== null && frame.ymax !== null) {
    const bandRows = groupRows
      .map((rows) =>
        rows.filter(
          (row) => Number.isFinite(frame.ymin![row]!) && Number.isFinite(frame.ymax![row]!),
        ),
      )
      .filter((rows) => rows.length > 1);
    if (bandRows.length > 0) {
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
      out.push({
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
      });
    }
  }

  // --- fitted line --------------------------------------------------------------
  let total = 0;
  for (const rows of groupRows) total += rows.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(groupRows.length + 1);
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < groupRows.length; s++) {
    pathOffsets[s] = cursor;
    const rows = groupRows[s]!;
    for (const row of rows) {
      const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
      const ty = positionOf(fx.yScale, frame.yNumeric, null, row);
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    strokes.push(
      groupColor(color, frame.colorValues, binding.color.scaledConstant, rows[0]!) ??
        binding.color.constant,
    );
  }
  pathOffsets[groupRows.length] = cursor;
  out.push({
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    pathOffsets,
    strokes,
    linewidth: params.linewidth ?? DEFAULT_SMOOTH_LINEWIDTH,
    alpha: params.alpha ?? 1,
    curve: "linear",
  });
  return out;
}

/**
 * Boxplot composite geometry, composed from existing batch kinds: whisker
 * segments (under), box rects (ink outline; paper fill when unmapped),
 * median segments (2× linewidth), outlier points.
 */
