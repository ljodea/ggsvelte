/**
 * Ribbon interval geometry: closed band between two varying bounds along a
 * running coordinate, plus optional outline path batches.
 */
import { layerPaintFromParams, resolveGlow, resolveGradientPaint } from "../mark-paint.js";
import type { PathsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  DEFAULT_LINEWIDTH,
  positionOf,
  removedWarning,
  sortFiniteSlotsInPlace,
  sortGroupRowsByX,
} from "./geometry-shared.js";
import {
  constantStyle,
  indexedStyleVector,
  numericStyleVector,
  paintVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { areaGroupFillsOf } from "./geometry-paths-area-fill.js";
import { closedRibbonBatch, openRibbonBatch } from "./geometry-ribbon-batches.js";

type Outline = "both" | "upper" | "lower" | "full";
type LineCap = "butt" | "round" | "square";
type LineJoin = "miter" | "round" | "bevel";

interface RibbonParams {
  alpha?: number;
  linewidth?: number;
  outline?: Outline;
  orientation?: "x" | "y";
  lineend?: LineCap;
  linejoin?: LineJoin;
}

interface RibbonRun {
  rows: number[];
  group: number;
}

function groupRibbonRows(frame: LayerFrame): number[][] {
  const byGroup = new Map<number, number[]>();
  for (let row = 0; row < frame.n; row++) {
    const group = frame.groups[row]!;
    let rows = byGroup.get(group);
    if (rows === undefined) {
      rows = [];
      byGroup.set(group, rows);
    }
    rows.push(row);
  }
  return [...byGroup.values()];
}

function ribbonParams(frame: LayerFrame): RibbonParams {
  const params = frame.binding.layer.params;
  if (params === undefined || params === null || typeof params !== "object") return {};
  const record = params as Record<string, unknown>;
  const out: RibbonParams = {};
  if (typeof record["alpha"] === "number") out.alpha = record["alpha"];
  if (typeof record["linewidth"] === "number") out.linewidth = record["linewidth"];
  if (
    record["outline"] === "both" ||
    record["outline"] === "upper" ||
    record["outline"] === "lower" ||
    record["outline"] === "full"
  ) {
    out.outline = record["outline"];
  }
  if (record["orientation"] === "x" || record["orientation"] === "y") {
    out.orientation = record["orientation"];
  }
  if (
    record["lineend"] === "butt" ||
    record["lineend"] === "round" ||
    record["lineend"] === "square"
  ) {
    out.lineend = record["lineend"];
  }
  if (
    record["linejoin"] === "miter" ||
    record["linejoin"] === "round" ||
    record["linejoin"] === "bevel"
  ) {
    out.linejoin = record["linejoin"];
  }
  return out;
}

function orientationOf(frame: LayerFrame): "x" | "y" {
  return frame.binding.ribbonOrientation ?? ribbonParams(frame).orientation ?? "x";
}

function lowerBound(frame: LayerFrame, orientation: "x" | "y"): Float64Array | null {
  return orientation === "x" ? frame.ymin : frame.xmin;
}

function upperBound(frame: LayerFrame, orientation: "x" | "y"): Float64Array | null {
  return orientation === "x" ? frame.ymax : frame.xmax;
}

/** Sort group rows along the running coordinate. */
function sortGroupRowsByRunning(
  groupRows: number[][],
  frame: LayerFrame,
  fx: Frame,
  orientation: "x" | "y",
): void {
  if (orientation === "x") {
    sortGroupRowsByX(groupRows, frame, fx);
    return;
  }
  if (fx.yScale.type === "band") {
    const keys = new Float64Array(frame.n);
    const yValues = frame.yValues;
    for (let row = 0; row < frame.n; row++) {
      keys[row] = fx.yScale.indexOf(yValues?.[row] ?? null) ?? Number.MAX_SAFE_INTEGER;
    }
    for (const rows of groupRows) rows.sort((a, b) => keys[a]! - keys[b]!);
    return;
  }
  // Gap-preserving continuous sort (same as x path via sortGroupRowsByX).
  const y = frame.yNumeric!;
  for (const rows of groupRows) sortFiniteSlotsInPlace(rows, y);
}

function scanFiniteRibbonRuns(
  frame: LayerFrame,
  fx: Frame,
  orientation: "x" | "y",
  groupRows: readonly number[][],
  lo: Float64Array,
  hi: Float64Array,
): { runs: RibbonRun[]; removed: number } {
  const runs: RibbonRun[] = [];
  let removed = 0;
  for (const rows of groupRows) {
    if (rows.length === 0) continue;
    const group = frame.groups[rows[0]!]!;
    let current: number[] = [];
    for (const row of rows) {
      const a = lo[row]!;
      const b = hi[row]!;
      const running = projectRunning(frame, fx, orientation, row);
      const lower = projectMeasure(frame, fx, orientation, a);
      const upper = projectMeasure(frame, fx, orientation, b);
      if (
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        !Number.isFinite(running) ||
        !Number.isFinite(lower) ||
        !Number.isFinite(upper)
      ) {
        removed++;
        if (current.length >= 2) runs.push({ rows: current, group });
        current = [];
        continue;
      }
      current.push(row);
    }
    if (current.length >= 2) runs.push({ rows: current, group });
    else if (current.length === 1) removed++;
  }
  return { runs, removed };
}

/**
 * Collect finite runs: running + both bounds finite. Gaps split groups into
 * multiple closed subpaths (ggplot2 ribbon NA handling).
 *
 * Does not use {@link bucketByGroup} because y-oriented ribbons have no x
 * channel (and x-oriented may lack a finite y until bounds are applied).
 */
function finiteRibbonRuns(
  frame: LayerFrame,
  fx: Frame,
  orientation: "x" | "y",
  warnings: PipelineWarning[],
): RibbonRun[] {
  const lo = lowerBound(frame, orientation);
  const hi = upperBound(frame, orientation);
  // Band running axes leave xNumeric/yNumeric null; projection uses values.
  if (lo === null || hi === null) return [];
  if (orientation === "x" && frame.xNumeric === null && frame.xValues === null) return [];
  if (orientation === "y" && frame.yNumeric === null && frame.yValues === null) return [];

  // Bucket by group without requiring the orthogonal axis.
  const groupRows = groupRibbonRows(frame);
  if (groupRows.length === 0) return [];
  sortGroupRowsByRunning(groupRows, frame, fx, orientation);

  // Require finite bounds plus projectable running and measure coordinates.
  const { runs, removed } = scanFiniteRibbonRuns(frame, fx, orientation, groupRows, lo, hi);
  if (removed > 0) removedWarning(removed, frame.binding.index, warnings);
  return runs;
}

function projectRunning(frame: LayerFrame, fx: Frame, orientation: "x" | "y", row: number): number {
  if (orientation === "x") {
    return positionOf(fx.xScale, frame.xNumeric, frame.xValues, row) * fx.innerWidth;
  }
  const ty = positionOf(fx.yScale, frame.yNumeric, frame.yValues, row);
  return fx.innerHeight - ty * fx.innerHeight;
}

function projectMeasure(
  frame: LayerFrame,
  fx: Frame,
  orientation: "x" | "y",
  value: number,
): number {
  if (orientation === "x") {
    const ty = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(value);
    return fx.innerHeight - ty * fx.innerHeight;
  }
  const tx = fx.xScale.type === "band" ? NaN : fx.xScale.normalizeTransformed(value);
  return tx * fx.innerWidth;
}

function writeClosedRuns(input: {
  frame: LayerFrame;
  fx: Frame;
  orientation: "x" | "y";
  runs: readonly RibbonRun[];
  fillOf: (runIndex: number) => string | null;
  strokeOf: (runIndex: number) => string | null;
  strokeWidth: number;
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  closedFrameRows: Uint32Array;
  pathOffsets: Uint32Array;
  fills: (string | null)[];
  strokes: (string | null)[];
} {
  const { frame, fx, orientation, runs, fillOf, strokeOf, strokeWidth } = input;
  const lo = lowerBound(frame, orientation)!;
  const hi = upperBound(frame, orientation)!;
  let total = 0;
  for (const run of runs) total += run.rows.length * 2;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const closedFrameRows = new Uint32Array(total);
  const pathOffsets = new Uint32Array(runs.length + 1);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];
  let cursor = 0;
  for (let s = 0; s < runs.length; s++) {
    pathOffsets[s] = cursor;
    const rows = runs[s]!.rows;
    for (const row of rows) {
      const running = projectRunning(frame, fx, orientation, row);
      const measure = projectMeasure(frame, fx, orientation, hi[row]!);
      if (orientation === "x") {
        positions[cursor * 2] = running;
        positions[cursor * 2 + 1] = measure;
      } else {
        positions[cursor * 2] = measure;
        positions[cursor * 2 + 1] = running;
      }
      rowIndex[cursor] = frame.rowIndex[row]!;
      closedFrameRows[cursor] = row;
      cursor++;
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]!;
      const running = projectRunning(frame, fx, orientation, row);
      const measure = projectMeasure(frame, fx, orientation, lo[row]!);
      if (orientation === "x") {
        positions[cursor * 2] = running;
        positions[cursor * 2 + 1] = measure;
      } else {
        positions[cursor * 2] = measure;
        positions[cursor * 2 + 1] = running;
      }
      rowIndex[cursor] = frame.rowIndex[row]!;
      closedFrameRows[cursor] = row;
      cursor++;
    }
    fills.push(fillOf(s));
    strokes.push(strokeWidth > 0 ? strokeOf(s) : null);
  }
  pathOffsets[runs.length] = cursor;
  return { positions, rowIndex, closedFrameRows, pathOffsets, fills, strokes };
}

function writeOpenEdges(input: {
  frame: LayerFrame;
  fx: Frame;
  orientation: "x" | "y";
  runs: readonly RibbonRun[];
  edge: "upper" | "lower" | "both";
  strokeOf: (runIndex: number) => string | null;
}): {
  positions: Float32Array;
  rowIndex: Uint32Array;
  frameRowIndex: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
} {
  const { frame, fx, orientation, runs, edge, strokeOf } = input;
  const lo = lowerBound(frame, orientation)!;
  const hi = upperBound(frame, orientation)!;
  const edges: ("upper" | "lower")[] =
    edge === "both" ? ["upper", "lower"] : edge === "upper" ? ["upper"] : ["lower"];

  let total = 0;
  for (const run of runs) total += run.rows.length * edges.length;
  const positions = new Float32Array(total * 2);
  const rowIndex = new Uint32Array(total);
  const frameRowIndex = new Uint32Array(total);
  const pathOffsets = new Uint32Array(runs.length * edges.length + 1);
  const strokes: (string | null)[] = [];
  let cursor = 0;
  let sub = 0;
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r]!;
    for (const which of edges) {
      pathOffsets[sub] = cursor;
      const bound = which === "upper" ? hi : lo;
      for (const row of run.rows) {
        const running = projectRunning(frame, fx, orientation, row);
        const measure = projectMeasure(frame, fx, orientation, bound[row]!);
        if (orientation === "x") {
          positions[cursor * 2] = running;
          positions[cursor * 2 + 1] = measure;
        } else {
          positions[cursor * 2] = measure;
          positions[cursor * 2 + 1] = running;
        }
        rowIndex[cursor] = frame.rowIndex[row]!;
        frameRowIndex[cursor] = row;
        cursor++;
      }
      strokes.push(strokeOf(r));
      sub++;
    }
  }
  pathOffsets[sub] = cursor;
  return { positions, rowIndex, frameRowIndex, pathOffsets, strokes };
}

function hasExplicitColorBinding(frame: LayerFrame): boolean {
  const { color } = frame.binding;
  return color.field !== null || color.constant !== null || color.scaledConstant !== null;
}

export function ribbonBatches(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PathsBatch[] {
  const orientation = orientationOf(frame);
  const lo = lowerBound(frame, orientation);
  const hi = upperBound(frame, orientation);
  if (lo === null || hi === null) return [];

  const runs = finiteRibbonRuns(frame, fx, orientation, warnings);
  if (runs.length === 0) return [];

  const params = ribbonParams(frame);
  const outline: Outline = params.outline ?? "both";
  const linecap: LineCap = params.lineend ?? "butt";
  const linejoin: LineJoin = params.linejoin ?? "round";
  const styleRows = runs.map((run) => run.rows[0]!);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);
  const linetypeIndexes = indexedStyleVector(frame, "linetype", styleRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  const literalLinetype = frame.binding.linetype.constant;
  const constantAlpha = constantStyle(frame.binding, params, "alpha", 1);
  const paint = layerPaintFromParams(frame.binding.layer.params);
  const layerIndex = frame.binding.index;
  const fillPaintResolved =
    paint.fillPaint === null
      ? undefined
      : resolveGradientPaint(paint.fillPaint, layerIndex, "fill");
  const strokePaintResolved =
    paint.strokePaint === null
      ? undefined
      : resolveGradientPaint(paint.strokePaint, layerIndex, "stroke");
  const glowResolved = paint.glow === null ? undefined : resolveGlow(paint.glow, layerIndex);

  // One fill vector + one stroke vector for all ribbon runs (#1309).
  const fillPaints = areaGroupFillsOf(frame, fill, styleRows);
  const solidStrokes = hasExplicitColorBinding(frame)
    ? paintVector(frame, "color", color, styleRows)
    : null;
  const strokeOf = (runIndex: number) => {
    if (solidStrokes !== null) {
      const solid = solidStrokes[runIndex]!;
      if (solid !== null) return solid;
    }
    // strokePaint supplies a solid fallback so outlines can activate without
    // aes.color (within-mark paint is not a data scale).
    return strokePaintResolved?.fallback ?? null;
  };
  const hasExplicitColor =
    strokePaintResolved !== undefined ||
    (solidStrokes !== null && solidStrokes.some((s) => s !== null));
  const outlineWidth = constantStyle(frame.binding, params, "linewidth", DEFAULT_LINEWIDTH);

  const fullStroke = outline === "full" && hasExplicitColor;
  const closed = writeClosedRuns({
    frame,
    fx,
    orientation,
    runs,
    fillOf: (runIndex) => fillPaints[runIndex] ?? fillPaintResolved?.fallback ?? null,
    strokeOf,
    strokeWidth: fullStroke ? outlineWidth : 0,
  });
  const out: PathsBatch[] = [
    closedRibbonBatch({
      layerIndex,
      closed,
      fullStroke,
      outlineWidth,
      constantAlpha,
      alphas,
      linewidths,
      linetypeIndexes,
      literalLinetype,
      linecap,
      linejoin,
      fillPaintResolved,
      strokePaintResolved,
      glowResolved,
    }),
  ];

  if (outline !== "full" && hasExplicitColor) {
    // Open outline batches are presentation-only (no candidate duplication).
    const open = writeOpenEdges({ frame, fx, orientation, runs, edge: outline, strokeOf });
    out.push(
      openRibbonBatch({
        layerIndex,
        open,
        edgeCount: outline === "both" ? 2 : 1,
        outlineWidth,
        constantAlpha,
        alphas,
        linewidths,
        linetypeIndexes,
        literalLinetype,
        linecap,
        linejoin,
        strokePaintResolved,
      }),
    );
  }

  return out;
}
