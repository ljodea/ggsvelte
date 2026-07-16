/**
 * Simple mark geometry: points, lines, areas, rects, segments, glyphs.
 */
import type { GlyphsBatch, PathsBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../scene.js";
import { bandKey } from "../scales/train.js";
import { cellToNumber } from "../table.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  DEFAULT_BAR_WIDTH,
  DEFAULT_LINEWIDTH,
  DEFAULT_POINT_SIZE,
  DEFAULT_RULE_LINEWIDTH,
  DEFAULT_TEXT_SIZE,
  bucketByGroup,
  positionOf,
  removedWarning,
  xSortKey,
} from "./geometry-shared.js";

export function pointsBatch(
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

export function rectsBatch(
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

export function segmentsBatch(
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

export function glyphsBatch(
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
