/**
 * Composite geometry: smooth (ribbon+line), boxplot, and errorbar batches.
 */
import type { BoxplotParams, ErrorbarParams, SmoothParams } from "@ggsvelte/spec";

import type { GeometryBatch, RectsBatch, SegmentsBatch } from "../scene.js";
import { resolution as resolutionOf } from "../stats/numeric.js";
import type { CellValue } from "../table.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  DEFAULT_BAR_WIDTH,
  DEFAULT_RULE_LINEWIDTH,
  bucketByGroup,
  positionOf,
  removedWarning,
  xSortKey,
} from "./geometry-shared.js";

const DEFAULT_SMOOTH_LINEWIDTH = 1;
/** Ribbon fill opacity (ggplot2 uses 0.4 on grey60; 0.3 reads better over
 *  theme-accent fills — decision 0010). */
const SMOOTH_RIBBON_ALPHA = 0.3;
const DEFAULT_BOX_LINEWIDTH = 1;
/** Median line draws at 2× the box linewidth (ggplot2's fatten = 2). */
const BOX_MEDIAN_FATTEN = 2;
const DEFAULT_OUTLIER_SIZE = 1.5;
const DEFAULT_ERRORBAR_WIDTH = 0.9;

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

/**
 * Smooth geometry: an optional confidence ribbon (filled band under the
 * line) plus the fitted line, one subpath per group. Rows with a NaN band
 * are skipped in the ribbon only — the line still draws through them.
 */
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
export function boxplotBatches(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const { binding, n } = frame;
  const box = frame.box;
  if (
    box === null ||
    frame.ymin === null ||
    frame.ymax === null ||
    fx.xScale.type !== "band" ||
    fx.yScale.type === "band"
  ) {
    return [];
  }
  const params = (binding.layer.params ?? {}) as BoxplotParams;
  const widthFrac = (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step;
  const linewidth = params.linewidth ?? DEFAULT_BOX_LINEWIDTH;
  const alpha = params.alpha ?? 1;
  const yScale = fx.yScale;

  const centerPx: number[] = [];
  const halfPx: number[] = [];
  const rects: number[] = [];
  const rectRows: number[] = [];
  const keptRows: number[] = [];
  const whiskers: number[] = [];
  const whiskerRows: number[] = [];
  const medians: number[] = [];
  const medianRows: number[] = [];
  let removed = 0;

  const yPx = (v: number) => fx.innerHeight - yScale.normalize(v) * fx.innerHeight;

  for (let row = 0; row < n; row++) {
    const tc = fx.xScale.normalize(frame.xValues?.[row] ?? null);
    const lo = frame.ymin[row]!;
    const q1 = box.lower[row]!;
    const q2 = box.middle[row]!;
    const q3 = box.upper[row]!;
    const hi = frame.ymax[row]!;
    if (
      tc === undefined ||
      ![lo, q1, q2, q3, hi].every((v) => Number.isFinite(yScale.normalize(v)))
    ) {
      removed++;
      centerPx.push(NaN);
      halfPx.push(NaN);
      continue;
    }
    let center = tc;
    let w = widthFrac;
    if (frame.dodgeSlot !== null && frame.dodgeSlotCounts !== null) {
      const slotCount = Math.max(1, frame.dodgeSlotCounts[row]!);
      w = widthFrac / slotCount;
      center = tc + widthFrac * ((frame.dodgeSlot[row]! + 0.5) / slotCount - 0.5);
    }
    const cx = center * fx.innerWidth;
    const half = (w / 2) * fx.innerWidth;
    centerPx.push(cx);
    halfPx.push(half);
    // Box: lower..upper hinges.
    rects.push(cx - half, Math.min(yPx(q3), yPx(q1)), half * 2, Math.abs(yPx(q1) - yPx(q3)));
    rectRows.push(frame.rowIndex[row]!);
    keptRows.push(row);
    // Whiskers: hinge -> whisker end, both directions.
    whiskers.push(cx, yPx(q3), cx, yPx(hi), cx, yPx(q1), cx, yPx(lo));
    whiskerRows.push(frame.rowIndex[row]!, frame.rowIndex[row]!);
    // Median line across the box.
    medians.push(cx - half, yPx(q2), cx + half, yPx(q2));
    medianRows.push(frame.rowIndex[row]!);
  }
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return [];

  const rectsBatchOut: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(rects),
    rowIndex: Uint32Array.from(rectRows),
    fill: binding.fill.constant,
    fillRole: "paper",
    stroke: null,
    strokeWidth: linewidth,
    alpha,
  };
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    rectsBatchOut.fills = keptRows.map((row) =>
      colorOf(
        fill,
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!,
      ),
    );
  }

  const out: GeometryBatch[] = [
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(whiskers),
      rowIndex: Uint32Array.from(whiskerRows),
      stroke: null,
      linewidth,
      alpha,
    },
    rectsBatchOut,
    {
      kind: "segments",
      layerIndex: binding.index,
      panelIndex: 0,
      segments: Float32Array.from(medians),
      rowIndex: Uint32Array.from(medianRows),
      stroke: null,
      linewidth: linewidth * BOX_MEDIAN_FATTEN,
      alpha,
    },
  ];

  // Outliers as points, at their (possibly dodged) box's x.
  if (box.outlierY.length > 0) {
    const positions: number[] = [];
    const rowIndex: number[] = [];
    for (let i = 0; i < box.outlierY.length; i++) {
      const boxRow = box.outlierBox[i]!;
      const cx = centerPx[boxRow];
      const ty = yScale.normalize(box.outlierY[i]!);
      if (cx === undefined || Number.isNaN(cx) || Number.isNaN(ty)) continue;
      positions.push(cx, fx.innerHeight - ty * fx.innerHeight);
      rowIndex.push(NO_ROW);
    }
    if (rowIndex.length > 0) {
      out.push({
        kind: "points",
        layerIndex: binding.index,
        panelIndex: 0,
        positions: Float32Array.from(positions),
        rowIndex: Uint32Array.from(rowIndex),
        size: params.outlierSize ?? DEFAULT_OUTLIER_SIZE,
        alpha,
        shape: "circle",
        fill: null,
      });
    }
  }
  return out;
}

/**
 * Errorbar geometry: three segments per row — the vertical range plus the
 * two caps (cap width = params.width of a band step on discrete x, or of
 * the data resolution on continuous x).
 */
export function errorbarBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding, n } = frame;
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const params = (binding.layer.params ?? {}) as ErrorbarParams;
  const widthParam = params.width ?? DEFAULT_ERRORBAR_WIDTH;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  // Cap half-width in normalized [0,1] units.
  let halfOf: (row: number) => number;
  if (fx.xScale.type === "band") {
    const half = (widthParam * fx.xScale.step) / 2;
    halfOf = () => half;
  } else {
    const res = frame.xNumeric === null ? 0 : resolutionOf(frame.xNumeric);
    const scale = fx.xScale;
    halfOf = (row: number) => {
      if (res === 0 || frame.xNumeric === null) return 0.01; // lone x: 2% of panel
      const v = frame.xNumeric[row]!;
      return Math.abs(scale.normalize(v + (widthParam * res) / 2) - scale.normalize(v));
    };
  }

  const segments: number[] = [];
  const rowIndex: number[] = [];
  const strokes: string[] = [];
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.normalize(frame.ymin[row]!);
    const t1 = fx.yScale.normalize(frame.ymax[row]!);
    if (Number.isNaN(tx) || Number.isNaN(t0) || Number.isNaN(t1)) {
      removed++;
      continue;
    }
    const cx = tx * fx.innerWidth;
    const half = halfOf(row) * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    segments.push(cx, y0, cx, y1, cx - half, y0, cx + half, y0, cx - half, y1, cx + half, y1);
    const src = frame.rowIndex[row]!;
    rowIndex.push(src, src, src);
    if (wantsColors) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      const c = colorOf(color, value);
      strokes.push(c, c, c);
    }
  }
  removedWarning(removed, binding.index, warnings);
  if (rowIndex.length === 0) return null;

  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments: Float32Array.from(segments),
    rowIndex: Uint32Array.from(rowIndex),
    stroke: binding.color.constant,
    linewidth: params.linewidth ?? DEFAULT_RULE_LINEWIDTH,
    alpha: params.alpha ?? 1,
  };
  if (wantsColors) batch.strokes = strokes;
  return batch;
}
