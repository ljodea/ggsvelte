/**
 * Interval family beyond errorbar: linerange (stem only), pointrange (stem +
 * mid point), crossbar (vertical box + mid line). Clean-room #793.
 *
 * Width for crossbar reuses makeErrorbarXSpan (resolution-based continuous x).
 */
import type { CrossbarParams, ErrorbarParams, PointrangeParams } from "@ggsvelte/spec";

import type { GeometryBatch, PointsBatch, RectsBatch, SegmentsBatch } from "../scene.js";
import { linetypeIndex, pointShapeIndex, type Linetype, type PointShape } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  DEFAULT_POINT_SIZE,
  DEFAULT_RULE_LINEWIDTH,
  positionOf,
  removedWarning,
} from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { makeErrorbarXSpan } from "./geometry-errorbar-width.js";

const DEFAULT_WIDTH = 0.9;
const DEFAULT_CROSSBAR_FATTEN = 2.5;

function packStrokeBatch(
  frame: LayerFrame,
  styles: ResolvedStyleScales,
  segments: Float32Array,
  rowIndex: Uint32Array,
  styleRows: Uint32Array,
  strokes: string[] | null,
  params: { linewidth?: number; alpha?: number; linetype?: string },
  linewidthScale = 1,
): SegmentsBatch {
  const { binding } = frame;
  const baseLw =
    typeof binding.linewidth?.constant === "number"
      ? binding.linewidth.constant
      : (params.linewidth ?? DEFAULT_RULE_LINEWIDTH);
  const batch: SegmentsBatch = {
    kind: "segments",
    layerIndex: binding.index,
    panelIndex: 0,
    segments,
    rowIndex,
    stroke: binding.color.constant,
    linewidth: baseLw * linewidthScale,
    alpha:
      typeof binding.alpha?.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
    ...(typeof binding.linetype?.constant === "string" && {
      linetype: binding.linetype.constant as Linetype,
    }),
  };
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linetypeIndexes = indexedStyleVector(frame, "linetype", styleRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  if (linewidths !== undefined) {
    const scaled = new Float32Array(linewidths.length);
    for (let i = 0; i < linewidths.length; i++) scaled[i] = linewidths[i]! * linewidthScale;
    batch.linewidths = scaled;
  }
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (linetypeIndexes !== undefined) batch.linetypeIndexes = linetypeIndexes;
  if (strokes !== null) batch.strokes = strokes;
  return batch;
}

/** Vertical stem only — one segment per kept row. */
export function linerangeBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): SegmentsBatch | null {
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const { binding, n } = frame;
  const params = (binding.layer.params ?? {}) as ErrorbarParams;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const segments = new Float32Array(n * 4);
  const rowIndex = new Uint32Array(n);
  const styleRows = new Uint32Array(n);
  const strokes = wantsColors && color !== null ? Array.from<string>({ length: n }) : null;
  let kept = 0;
  let removed = 0;

  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.normalizeTransformed(frame.ymin[row]!);
    const t1 = fx.yScale.normalizeTransformed(frame.ymax[row]!);
    if (
      Number.isNaN(tx) ||
      t0 === undefined ||
      t1 === undefined ||
      Number.isNaN(t0) ||
      Number.isNaN(t1)
    ) {
      removed++;
      continue;
    }
    const cx = tx * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    const so = kept * 4;
    segments[so] = cx;
    segments[so + 1] = y0;
    segments[so + 2] = cx;
    segments[so + 3] = y1;
    rowIndex[kept] = frame.rowIndex[row]!;
    styleRows[kept] = row;
    if (strokes !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      strokes[kept] = colorOf(color!, value);
    }
    kept++;
  }

  removedWarning(removed, binding.index, warnings);
  if (kept === 0) return null;
  const outSeg = kept === n ? segments : segments.subarray(0, kept * 4).slice();
  const outRows = kept === n ? rowIndex : rowIndex.subarray(0, kept).slice();
  const outStyle = kept === n ? styleRows : styleRows.subarray(0, kept).slice();
  const outStrokes = strokes === null ? null : kept === n ? strokes : strokes.slice(0, kept);
  return packStrokeBatch(frame, styles, outSeg, outRows, outStyle, outStrokes, params);
}

/** Stem segments + mid points (y required for identity; summary provides y). */
export function pointrangeBatches(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  const stem = linerangeBatch(frame, fx, color, styles, warnings);
  const points = midPointsBatch(frame, fx, color, styles);
  const out: GeometryBatch[] = [];
  if (stem !== null) out.push(stem);
  if (points !== null) out.push(points);
  return out;
}

function midPointsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
): PointsBatch | null {
  if (frame.yNumeric === null && frame.yValues === null) return null;
  // Same band/ymin/ymax gate as linerangeBatch — continuous interval only.
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return null;
  const yScale = fx.yScale;
  const { binding, n } = frame;
  const params = (binding.layer.params ?? {}) as PointrangeParams;
  const wantsColors =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);

  const positions = new Float32Array(n * 2);
  const rowIndex = new Uint32Array(n);
  const styleRows = new Uint32Array(n);
  const colors = wantsColors && color !== null ? Array.from<string>({ length: n }) : null;
  let kept = 0;

  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
    // Match linerangeBatch: drop when interval bounds are missing so a
    // pointrange never draws a floating mid point without a stem.
    const t0 = yScale.normalizeTransformed(frame.ymin[row]!);
    const t1 = yScale.normalizeTransformed(frame.ymax[row]!);
    if (
      Number.isNaN(tx) ||
      Number.isNaN(ty) ||
      t0 === undefined ||
      t1 === undefined ||
      Number.isNaN(t0) ||
      Number.isNaN(t1)
    ) {
      continue;
    }
    const o = kept * 2;
    positions[o] = tx * fx.innerWidth;
    positions[o + 1] = fx.innerHeight - ty * fx.innerHeight;
    rowIndex[kept] = frame.rowIndex[row]!;
    styleRows[kept] = row;
    if (colors !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors[kept] = colorOf(color!, value);
    }
    kept++;
  }
  if (kept === 0) return null;

  const outPos = kept === n ? positions : positions.subarray(0, kept * 2).slice();
  const outRows = kept === n ? rowIndex : rowIndex.subarray(0, kept).slice();
  const outStyle = kept === n ? styleRows : styleRows.subarray(0, kept).slice();
  const batch: PointsBatch = {
    kind: "points",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: outPos,
    rowIndex: outRows,
    size:
      typeof binding.size?.constant === "number"
        ? binding.size.constant
        : (params.size ?? DEFAULT_POINT_SIZE),
    alpha:
      typeof binding.alpha?.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
    shape:
      typeof binding.shape?.constant === "string"
        ? (binding.shape.constant as PointShape)
        : (params.shape ?? "circle"),
    fill: binding.color.constant,
  };
  const sizes = numericStyleVector(frame, "size", outStyle, styles);
  const alphas = numericStyleVector(frame, "alpha", outStyle, styles);
  const shapeIndexes = indexedStyleVector(frame, "shape", outStyle, styles, (value) =>
    pointShapeIndex(value as PointShape),
  );
  if (sizes !== undefined) batch.sizes = sizes;
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (shapeIndexes !== undefined) batch.shapeIndexes = shapeIndexes;
  if (colors !== null) batch.colors = kept === n ? colors : colors.slice(0, kept);
  return batch;
}

/** Crossbar: vertical box (ymin–ymax × width) + mid horizontal line at y. */
export function crossbarBatches(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  if (frame.ymin === null || frame.ymax === null || fx.yScale.type === "band") return [];
  const { binding, n } = frame;
  const params = (binding.layer.params ?? {}) as CrossbarParams;
  const widthParam = params.width ?? DEFAULT_WIDTH;
  const fatten =
    typeof params.fatten === "number" && params.fatten > 0
      ? params.fatten
      : DEFAULT_CROSSBAR_FATTEN;
  const xSpanOf = makeErrorbarXSpan(frame, fx, widthParam);
  const wantsStroke =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  const wantsFill =
    fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null);

  // Rect: 1 per row (x0,y0,x1,y1 packed as left,top,right,bottom in pixel space)
  const rects = new Float32Array(n * 4);
  const rectRows = new Uint32Array(n);
  const rectStyle = new Uint32Array(n);
  const fills = wantsFill && fill !== null ? Array.from<string>({ length: n }) : null;
  const strokes = wantsStroke && color !== null ? Array.from<string>({ length: n }) : null;

  // Mid line: 1 segment per row
  const segs = new Float32Array(n * 4);
  const segRows = new Uint32Array(n);
  const segStyle = new Uint32Array(n);
  const midStrokes = wantsStroke && color !== null ? Array.from<string>({ length: n }) : null;

  let kept = 0;
  let removed = 0;

  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.normalizeTransformed(frame.ymin[row]!);
    const t1 = fx.yScale.normalizeTransformed(frame.ymax[row]!);
    const ty =
      frame.yNumeric !== null || frame.yValues !== null
        ? positionOf(fx.yScale, frame.yNumeric, frame.yValues, row)
        : NaN;
    if (
      Number.isNaN(tx) ||
      t0 === undefined ||
      t1 === undefined ||
      Number.isNaN(t0) ||
      Number.isNaN(t1) ||
      Number.isNaN(ty)
    ) {
      removed++;
      continue;
    }
    const [x0n, x1n] = xSpanOf(row, tx);
    if (!Number.isFinite(x0n) || !Number.isFinite(x1n)) {
      removed++;
      continue;
    }
    const px0 = Math.min(x0n, x1n) * fx.innerWidth;
    const px1 = Math.max(x0n, x1n) * fx.innerWidth;
    const yTop = fx.innerHeight - Math.max(t0, t1) * fx.innerHeight;
    const yBot = fx.innerHeight - Math.min(t0, t1) * fx.innerHeight;
    const midY = fx.innerHeight - ty * fx.innerHeight;
    const wPx = Math.max(px1 - px0, 0);
    const hPx = Math.max(yBot - yTop, 0);

    const ro = kept * 4;
    // RectsBatch packs x, y, width, height (top-left origin).
    rects[ro] = px0;
    rects[ro + 1] = yTop;
    rects[ro + 2] = wPx;
    rects[ro + 3] = hPx;
    rectRows[kept] = frame.rowIndex[row]!;
    rectStyle[kept] = row;

    segs[ro] = px0;
    segs[ro + 1] = midY;
    segs[ro + 2] = px1;
    segs[ro + 3] = midY;
    segRows[kept] = frame.rowIndex[row]!;
    segStyle[kept] = row;

    if (fills !== null) {
      const value =
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!;
      fills[kept] = colorOf(fill!, value);
    }
    if (strokes !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      const c = colorOf(color!, value);
      strokes[kept] = c;
      if (midStrokes !== null) midStrokes[kept] = c;
    }
    kept++;
  }

  removedWarning(removed, binding.index, warnings);
  if (kept === 0) return [];

  const outRects = kept === n ? rects : rects.subarray(0, kept * 4).slice();
  const outRectRows = kept === n ? rectRows : rectRows.subarray(0, kept).slice();
  const outRectStyle = kept === n ? rectStyle : rectStyle.subarray(0, kept).slice();
  const outSegs = kept === n ? segs : segs.subarray(0, kept * 4).slice();
  const outSegRows = kept === n ? segRows : segRows.subarray(0, kept).slice();
  const outSegStyle = kept === n ? segStyle : segStyle.subarray(0, kept).slice();

  const strokeWidth =
    typeof binding.linewidth?.constant === "number"
      ? binding.linewidth.constant
      : (params.linewidth ?? DEFAULT_RULE_LINEWIDTH);
  // ggplot2 geom_crossbar defaults fill = NA (outlined box). Match boxplot
  // body: paper fillRole when no fill is mapped/constant.
  const hasFill =
    binding.fill.constant !== null ||
    binding.fill.field !== null ||
    binding.fill.scaledConstant !== null ||
    fills !== null;
  const rectBatch: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: outRects,
    rowIndex: outRectRows,
    fill: binding.fill.constant,
    ...(hasFill ? {} : { fillRole: "paper" as const }),
    alpha:
      typeof binding.alpha?.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
    stroke: binding.color.constant,
    strokeWidth,
    anchor: "center",
  };
  const alphas = numericStyleVector(frame, "alpha", outRectStyle, styles);
  if (alphas !== undefined) {
    rectBatch.alpha = 1;
    rectBatch.alphas = alphas;
  }
  if (fills !== null) rectBatch.fills = kept === n ? fills : fills.slice(0, kept);
  if (strokes !== null) rectBatch.strokes = kept === n ? strokes : strokes.slice(0, kept);
  // Mapped linewidth/linetype must style the box outline as well as the mid
  // line (STYLE_AESTHETIC_GEOMS enrolls crossbar on both).
  const linewidths = numericStyleVector(frame, "linewidth", outRectStyle, styles);
  if (linewidths !== undefined) rectBatch.strokeWidths = linewidths;
  if (typeof binding.linetype?.constant === "string") {
    rectBatch.linetype = binding.linetype.constant as Linetype;
  }
  const linetypeIndexes = indexedStyleVector(frame, "linetype", outRectStyle, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  if (linetypeIndexes !== undefined) rectBatch.linetypeIndexes = linetypeIndexes;

  const mid = packStrokeBatch(
    frame,
    styles,
    outSegs,
    outSegRows,
    outSegStyle,
    midStrokes === null ? null : kept === n ? midStrokes : midStrokes.slice(0, kept),
    params,
    fatten,
  );

  // Draw order: box first, mid line on top (single layerIndex).
  return [rectBatch, mid];
}
