/**
 * Ribbon interval geometry: closed band between two varying bounds along a
 * running coordinate, plus optional outline path batches.
 */
import type { PathsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  DEFAULT_LINEWIDTH,
  positionOf,
  removedWarning,
  sortGroupRowsByX,
} from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { areaGroupFillOf } from "./geometry-paths-area-fill.js";
import { colorOf } from "./types.js";

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

function runningNumeric(frame: LayerFrame, orientation: "x" | "y"): Float64Array | null {
  return orientation === "x" ? frame.xNumeric : frame.yNumeric;
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
  const y = frame.yNumeric!;
  for (const rows of groupRows) rows.sort((a, b) => y[a]! - y[b]!);
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
  const run = runningNumeric(frame, orientation);
  const lo = lowerBound(frame, orientation);
  const hi = upperBound(frame, orientation);
  if (run === null || lo === null || hi === null) return [];

  // Bucket by group without requiring the orthogonal axis.
  const byGroup = new Map<number, number[]>();
  for (let row = 0; row < frame.n; row++) {
    const g = frame.groups[row]!;
    let rows = byGroup.get(g);
    if (rows === undefined) {
      rows = [];
      byGroup.set(g, rows);
    }
    rows.push(row);
  }
  const groupRows = [...byGroup.values()];
  if (groupRows.length === 0) return [];
  sortGroupRowsByRunning(groupRows, frame, fx, orientation);

  const runs: RibbonRun[] = [];
  let removed = 0;
  for (const rows of groupRows) {
    if (rows.length === 0) continue;
    const group = frame.groups[rows[0]!]!;
    let current: number[] = [];
    for (const row of rows) {
      const r = run[row]!;
      const a = lo[row]!;
      const b = hi[row]!;
      // Also require the running coord to project (band rank / continuous).
      const runningPx = projectRunning(frame, fx, orientation, row);
      if (
        !Number.isFinite(r) ||
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        !Number.isFinite(runningPx)
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
  fillOf: (rows: readonly number[]) => string | null;
  strokeOf: (rows: readonly number[]) => string | null;
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
    fills.push(fillOf(rows));
    strokes.push(strokeWidth > 0 ? strokeOf(rows) : null);
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
  strokeOf: (rows: readonly number[]) => string | null;
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
  for (const run of runs) {
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
      strokes.push(strokeOf(run.rows));
      sub++;
    }
  }
  pathOffsets[sub] = cursor;
  return { positions, rowIndex, frameRowIndex, pathOffsets, strokes };
}

function explicitStrokeColor(
  frame: LayerFrame,
  color: ResolvedColorScale | null,
  rows: readonly number[],
): string | null {
  const { binding } = frame;
  // Outline only when color is explicitly supplied (mapped or constant).
  if (
    binding.color.field === null &&
    binding.color.constant === null &&
    binding.color.scaledConstant === null
  ) {
    return null;
  }
  if (color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null)) {
    const first = rows[0]!;
    const value =
      frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[first]!;
    return colorOf(color, value);
  }
  return binding.color.constant;
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
  const literalAlpha = frame.binding.alpha.constant;
  const literalLinewidth = frame.binding.linewidth.constant;
  const literalLinetype = frame.binding.linetype.constant;
  const strokeOf = (rows: readonly number[]) => explicitStrokeColor(frame, color, rows);
  const hasExplicitColor = runs.some((run) => strokeOf(run.rows) !== null);
  const outlineWidth =
    typeof literalLinewidth === "number"
      ? literalLinewidth
      : (params.linewidth ?? DEFAULT_LINEWIDTH);

  const out: PathsBatch[] = [];
  const fullStroke = outline === "full" && hasExplicitColor;
  const closed = writeClosedRuns({
    frame,
    fx,
    orientation,
    runs,
    fillOf: (rows) => areaGroupFillOf(frame, fill, rows),
    strokeOf,
    strokeWidth: fullStroke ? outlineWidth : 0,
  });

  out.push({
    kind: "paths",
    layerIndex: frame.binding.index,
    panelIndex: 0,
    positions: closed.positions,
    rowIndex: closed.rowIndex,
    closedFrameRows: closed.closedFrameRows,
    pathOffsets: closed.pathOffsets,
    strokes: closed.strokes,
    fills: closed.fills,
    closed: true,
    linewidth: fullStroke ? outlineWidth : 0,
    ...(fullStroke && linewidths !== undefined && { linewidths }),
    alpha:
      alphas === undefined
        ? typeof literalAlpha === "number"
          ? literalAlpha
          : (params.alpha ?? 1)
        : 1,
    ...(alphas !== undefined && { alphas }),
    ...(fullStroke &&
      typeof literalLinetype === "string" && { linetype: literalLinetype as Linetype }),
    ...(fullStroke && linetypeIndexes !== undefined && { linetypeIndexes }),
    ...(fullStroke && { linecap, linejoin }),
    curve: "linear",
  });

  if (outline !== "full" && hasExplicitColor) {
    const open = writeOpenEdges({
      frame,
      fx,
      orientation,
      runs,
      edge: outline,
      strokeOf,
    });
    // Open outline batches are presentation-only (no candidate duplication).
    out.push({
      kind: "paths",
      layerIndex: frame.binding.index,
      panelIndex: 0,
      positions: open.positions,
      rowIndex: open.rowIndex,
      frameRowIndex: open.frameRowIndex,
      pathOffsets: open.pathOffsets,
      strokes: open.strokes,
      linewidth: outlineWidth,
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
      linecap,
      linejoin,
      curve: "linear",
      candidates: false,
    });
  }

  return out;
}
