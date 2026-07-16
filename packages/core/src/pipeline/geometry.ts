/**
 * Geometry batch builders: map post-stat LayerFrames + trained scales into
 * typed-array Scene batches (points, paths, rects, segments, glyphs, and
 * composite smooth/boxplot/errorbar). Also owns coord-flip vertex remapping
 * and per-batch mark counting.
 */
import type { BoxplotParams, ErrorbarParams, SmoothParams } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";
import { bandKey } from "../scales/train.js";
import type {
  GeometryBatch,
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  SegmentsBatch,
} from "../scene.js";
import { resolution as resolutionOf } from "../stats/numeric.js";
import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, NO_ROW } from "./types.js";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const DEFAULT_POINT_SIZE = 2.5;
const DEFAULT_LINEWIDTH = 1.5;
const DEFAULT_RULE_LINEWIDTH = 1;
const DEFAULT_BAR_WIDTH = 0.9;
const DEFAULT_TEXT_SIZE = 11;

/** Panel-local frame extents + trained positional scales for batch builders. */
export interface Frame {
  innerWidth: number;
  innerHeight: number;
  xScale: PositionScale;
  yScale: PositionScale;
}

function positionOf(
  scale: PositionScale,
  numeric: Float64Array | null,
  column: readonly CellValue[] | null,
  row: number,
  offsets: Float64Array | null = null,
): number {
  if (scale.type === "band") {
    const t = scale.normalize(column?.[row] ?? null);
    if (t === undefined) return NaN;
    // Offsets on discrete axes are band-step fractions.
    return offsets === null ? t : t + offsets[row]! * scale.step;
  }
  const v = numeric?.[row];
  if (v === undefined || !Number.isFinite(v)) return NaN;
  // Offsets on continuous axes are data units.
  return scale.normalize(offsets === null ? v : v + offsets[row]!);
}

function removedWarning(removed: number, index: number, warnings: PipelineWarning[]): void {
  if (removed > 0) {
    warnings.push({
      code: "removed-missing",
      message: `Removed ${removed} row(s) with missing or non-finite positions (layer ${index}).`,
    });
  }
}

function pointsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): PointsBatch | null {
  const { binding, n } = frame;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row, frame.offsetX);
    const ty = positionOf(fx.yScale, frame.yNumeric, null, row, frame.offsetY);
    if (Number.isNaN(tx) || Number.isNaN(ty)) continue;
    xs[kept] = tx;
    ys[kept] = ty;
    keptRows[kept] = row;
    kept++;
  }
  removedWarning(n - kept, binding.index, warnings);
  if (kept === 0) return null;

  const positions = new Float32Array(kept * 2);
  const rowIndex = new Uint32Array(kept);
  for (let j = 0; j < kept; j++) {
    positions[j * 2] = xs[j]! * fx.innerWidth;
    positions[j * 2 + 1] = fx.innerHeight - ys[j]! * fx.innerHeight;
    rowIndex[j] = frame.rowIndex[keptRows[j]!]!;
  }

  const params = binding.layer.geom === "point" ? (binding.layer.params ?? {}) : {};
  const batch: PointsBatch = {
    kind: "points",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    size: params.size ?? DEFAULT_POINT_SIZE,
    alpha: params.alpha ?? 1,
    shape: params.shape ?? "circle",
    fill: binding.color.constant,
  };
  if (color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null)) {
    const colors = Array.from<string>({ length: kept });
    for (let j = 0; j < kept; j++) {
      const row = keptRows[j]!;
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors[j] = colorOf(color, value);
    }
    batch.colors = colors;
  }
  return batch;
}

/** Bucket post-stat rows per group, dropping rows with unresolvable positions. */
function bucketByGroup(
  frame: LayerFrame,
  fx: Frame,
  yNumericOverride: Float64Array | null,
  warnings: PipelineWarning[],
): number[][] {
  const groupRows: number[][] = [];
  let removed = 0;
  for (let row = 0; row < frame.n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = positionOf(fx.yScale, yNumericOverride ?? frame.yNumeric, null, row);
    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      removed++;
      continue;
    }
    const g = frame.groups[row]!;
    (groupRows[g] ??= []).push(row);
  }
  removedWarning(removed, frame.binding.index, warnings);
  return groupRows.filter((rows) => rows !== undefined && rows.length > 0);
}

function xSortKey(frame: LayerFrame, fx: Frame): (row: number) => number {
  return (row: number) =>
    fx.xScale.type === "band"
      ? (fx.xScale.indexOf(frame.xValues?.[row] ?? null) ?? Number.MAX_SAFE_INTEGER)
      : frame.xNumeric![row]!;
}

function lineBatch(
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

function areaBatch(
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

function rectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): RectsBatch | null {
  const { binding, n } = frame;
  if (frame.ymin === null || frame.ymax === null) return null;
  const binned = frame.xmin !== null && frame.xmax !== null;
  if (!binned && fx.xScale.type !== "band") return null;
  const params = (binding.layer.params ?? {}) as { width?: number; alpha?: number };
  const widthFrac =
    fx.xScale.type === "band" ? (params.width ?? DEFAULT_BAR_WIDTH) * fx.xScale.step : 0;

  const rects: number[] = [];
  const rowIndexKept: number[] = [];
  const keptRows: number[] = [];
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const t0 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymin[row]!);
    const t1 = fx.yScale.type === "band" ? NaN : fx.yScale.normalize(frame.ymax[row]!);
    let center: number;
    let w: number;
    if (binned) {
      // Bin rects span [xmin, xmax] on a continuous x (histograms).
      if (fx.xScale.type === "band") {
        removed++;
        continue;
      }
      const tx0 = fx.xScale.normalize(frame.xmin![row]!);
      const tx1 = fx.xScale.normalize(frame.xmax![row]!);
      if (Number.isNaN(tx0) || Number.isNaN(tx1) || Number.isNaN(t0) || Number.isNaN(t1)) {
        removed++;
        continue;
      }
      center = (tx0 + tx1) / 2;
      w = Math.abs(tx1 - tx0);
    } else {
      const tc =
        fx.xScale.type === "band" ? fx.xScale.normalize(frame.xValues?.[row] ?? null) : NaN;
      if (tc === undefined || Number.isNaN(tc) || Number.isNaN(t0) || Number.isNaN(t1)) {
        removed++;
        continue;
      }
      center = tc;
      w = widthFrac;
    }
    if (frame.dodgeSlot !== null && frame.dodgeSlotCounts !== null) {
      const slotCount = Math.max(1, frame.dodgeSlotCounts[row]!);
      const full = w;
      w = full / slotCount;
      center = center + full * ((frame.dodgeSlot[row]! + 0.5) / slotCount - 0.5);
    }
    const xPx = (center - w / 2) * fx.innerWidth;
    const wPx = w * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    rects.push(xPx, Math.min(y0, y1), wPx, Math.abs(y1 - y0));
    rowIndexKept.push(frame.rowIndex[row]!);
    keptRows.push(row);
  }
  removedWarning(removed, binding.index, warnings);
  if (keptRows.length === 0) return null;

  const batch: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: Float32Array.from(rects),
    rowIndex: Uint32Array.from(rowIndexKept),
    fill: binding.fill.constant,
    alpha: params.alpha ?? 1,
  };
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    batch.fills = keptRows.map((row) =>
      colorOf(
        fill,
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!,
      ),
    );
  }
  return batch;
}

function segmentsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  const { binding } = frame;
  const params = (binding.layer.params ?? {}) as { linewidth?: number; alpha?: number };
  const segments: number[] = [];
  const rowIndex: number[] = [];
  const perSegmentColors: string[] = [];
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  let removed = 0;

  const pushVertical = (t: number | undefined, row: number) => {
    if (t === undefined || Number.isNaN(t)) {
      removed++;
      return;
    }
    const x = t * fx.innerWidth;
    segments.push(x, 0, x, fx.innerHeight);
    rowIndex.push(row);
  };
  const pushHorizontal = (t: number | undefined, row: number) => {
    if (t === undefined || Number.isNaN(t)) {
      removed++;
      return;
    }
    const y = fx.innerHeight - t * fx.innerHeight;
    segments.push(0, y, fx.innerWidth, y);
    rowIndex.push(row);
  };

  if (binding.ruleForm === "annotation") {
    for (const v of frame.xIntercepts) {
      pushVertical(
        fx.xScale.type === "band" ? fx.xScale.normalize(v) : fx.xScale.normalize(cellToNumber(v)),
        NO_ROW,
      );
    }
    for (const v of frame.yIntercepts) {
      pushHorizontal(
        fx.yScale.type === "band" ? fx.yScale.normalize(v) : fx.yScale.normalize(cellToNumber(v)),
        NO_ROW,
      );
    }
  } else {
    for (let row = 0; row < frame.n; row++) {
      const before = rowIndex.length;
      if (binding.ruleForm === "vertical") {
        pushVertical(
          positionOf(fx.xScale, frame.xNumeric, frame.xValues, row),
          frame.rowIndex[row]!,
        );
      } else {
        pushHorizontal(positionOf(fx.yScale, frame.yNumeric, null, row), frame.rowIndex[row]!);
      }
      if (wantsColors && rowIndex.length > before) {
        const value =
          frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
        perSegmentColors.push(colorOf(color, value));
      }
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
  if (wantsColors && binding.ruleForm !== "annotation") batch.strokes = perSegmentColors;
  return batch;
}

function glyphsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GlyphsBatch | null {
  const { binding, n } = frame;
  const params = (binding.layer.params ?? {}) as {
    anchor?: "start" | "middle" | "end";
    size?: number;
    dx?: number;
    dy?: number;
    alpha?: number;
  };
  const dx = params.dx ?? 0;
  const dy = params.dy ?? 0;
  const positions: number[] = [];
  const rowIndex: number[] = [];
  const texts: string[] = [];
  const colors: string[] = [];
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row, frame.offsetX);
    const ty = positionOf(fx.yScale, frame.yNumeric, null, row, frame.offsetY);
    const label =
      binding.labelConstant ?? (frame.labelValues === null ? null : frame.labelValues[row]);
    if (Number.isNaN(tx) || Number.isNaN(ty) || label === null) {
      removed++;
      continue;
    }
    positions.push(tx * fx.innerWidth + dx, fx.innerHeight - ty * fx.innerHeight + dy);
    rowIndex.push(frame.rowIndex[row]!);
    texts.push(bandKey(label));
    if (wantsColors) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors.push(colorOf(color, value));
    }
  }
  removedWarning(removed, binding.index, warnings);
  if (texts.length === 0) return null;

  const batch: GlyphsBatch = {
    kind: "glyphs",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: Float32Array.from(positions),
    rowIndex: Uint32Array.from(rowIndex),
    texts,
    color: binding.color.constant,
    size: params.size ?? DEFAULT_TEXT_SIZE,
    anchor: params.anchor ?? "middle",
    alpha: params.alpha ?? 1,
  };
  if (wantsColors) batch.colors = colors;
  return batch;
}

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
function smoothBatches(
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
function boxplotBatches(
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
function errorbarBatch(
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

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

export function buildBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  switch (frame.binding.layer.geom) {
    case "point":
      return single(pointsBatch(frame, fx, color, warnings));
    case "line":
      return single(lineBatch(frame, fx, color, warnings));
    case "col":
    case "bar":
      return single(rectsBatch(frame, fx, fill, warnings));
    case "area":
    case "density":
      return single(areaBatch(frame, fx, fill, warnings));
    case "rule":
      return single(segmentsBatch(frame, fx, color, warnings));
    case "text":
      return single(glyphsBatch(frame, fx, color, warnings));
    case "smooth":
      return smoothBatches(frame, fx, color, fill, warnings);
    case "boxplot":
      return boxplotBatches(frame, fx, fill, warnings);
    case "errorbar":
      return single(errorbarBatch(frame, fx, color, warnings));
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// coord flip (the single orientation mechanism)
// ---------------------------------------------------------------------------

/**
 * Flip one batch in place. Geometry was computed against the UNFLIPPED frame
 * with swapped extents (innerWidth = panel height, innerHeight = panel
 * width); each vertex then maps (x, y) -> (W - y, H - x), which renders the
 * x channel vertically (first band at the bottom, like ggplot2's coord_flip)
 * and the y channel horizontally (increasing right).
 */
export function flipBatchInPlace(batch: GeometryBatch, width: number, height: number): void {
  const flipPoints = (a: Float32Array) => {
    for (let i = 0; i < a.length; i += 2) {
      const x = a[i]!;
      const y = a[i + 1]!;
      a[i] = width - y;
      a[i + 1] = height - x;
    }
  };
  switch (batch.kind) {
    case "points":
    case "glyphs":
    case "paths":
      flipPoints(batch.positions);
      break;
    case "segments":
      // x1,y1,x2,y2 = two vertices; the point transform applies pairwise.
      flipPoints(batch.segments);
      break;
    case "rects": {
      const r = batch.rects;
      for (let j = 0; j < r.length; j += 4) {
        const x = r[j]!;
        const y = r[j + 1]!;
        const w = r[j + 2]!;
        const h = r[j + 3]!;
        r[j] = width - (y + h);
        r[j + 1] = height - (x + w);
        r[j + 2] = h;
        r[j + 3] = w;
      }
      break;
    }
  }
}

/** Marks in one batch (points/glyphs per row, paths per subpath, ...). */
export function batchMarkCount(batch: GeometryBatch): number {
  switch (batch.kind) {
    case "points":
    case "glyphs":
      return batch.rowIndex.length;
    case "paths":
      return Math.max(0, batch.pathOffsets.length - 1);
    case "rects":
      return batch.rects.length / 4;
    default:
      return batch.segments.length / 4;
  }
}
