/**
 * Line path geometry batch builder.
 */
import { layerPaintFromParams, resolveGlow, resolveGradientPaint } from "../mark-paint.js";
import type { PathsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  constantStyle,
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import {
  DEFAULT_LINEWIDTH,
  bucketByGroup,
  sortGroupRowsByX,
  warnSingleObservationGroups,
} from "./geometry-shared.js";
import { writeContinuousLineOnePass, writeLineSubpaths } from "./geometry-paths-line-write.js";
import { splitStyleSubpaths } from "./geometry-paths-style-subpaths.js";

/** True when linewidth/alpha/linetype are not per-vertex mapped (style split free). */
function hasMappedStrokeStyle(frame: LayerFrame): boolean {
  return (["linewidth", "alpha", "linetype"] as const).some((aesthetic) => {
    const style = frame.binding[aesthetic];
    return style.field !== null || style.statColumn !== null || style.scaledConstant !== null;
  });
}

/** True when any group has x keys out of non-decreasing order. */
function groupsNeedXSort(
  groupRows: readonly (readonly number[])[],
  xNumeric: Float64Array,
): boolean {
  for (const rows of groupRows) {
    for (let i = 1; i < rows.length; i++) {
      if (xNumeric[rows[i]!]! < xNumeric[rows[i - 1]!]!) return true;
    }
  }
  return false;
}

type LineBuffers = {
  positions: Float32Array;
  rowIndex: Uint32Array;
  frameRowIndex?: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
  subpaths: readonly (readonly number[])[];
};

/**
 * Continuous multi-series: one normalize+pixel pass that also buckets by group.
 * Falls back to bucket → sort → write when stroke style is mapped, scales are
 * band, or x within a group needs sorting.
 */
function buildLineBuffers(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
  wantSortByX: boolean,
): LineBuffers | null {
  const canOnePass =
    !hasMappedStrokeStyle(frame) &&
    fx.xScale.type !== "band" &&
    fx.yScale.type !== "band" &&
    frame.xNumeric !== null &&
    frame.yNumeric !== null;
  const onePass = canOnePass ? writeContinuousLineOnePass({ frame, fx, color, warnings }) : null;

  if (onePass === null) {
    const groupedRows = bucketByGroup(frame, fx, null, warnings);
    if (groupedRows.length === 0) return null;
    warnSingleObservationGroups(groupedRows, frame, warnings);
    // geom_line sorts by x; geom_path keeps data/row order (#788).
    if (wantSortByX) sortGroupRowsByX(groupedRows, frame, fx);
    const subpaths = splitStyleSubpaths(frame, groupedRows, styles);
    const styleSplit = subpaths.length > groupedRows.length;
    const written = writeLineSubpaths({
      frame,
      fx,
      color,
      subpaths,
      includeFrameRows: styleSplit,
    });
    return { ...written, subpaths };
  }

  // If x within any group is out of order, fall back so sortGroupRowsByX +
  // write stay correct (one-pass pixels would desync after a row reorder).
  const needsSort = wantSortByX && groupsNeedXSort(onePass.groupRows, frame.xNumeric!);
  if (needsSort) {
    const groupedRows = onePass.groupRows.map((rows) => rows.slice());
    sortGroupRowsByX(groupedRows, frame, fx);
    warnSingleObservationGroups(groupedRows, frame, warnings);
    const written = writeLineSubpaths({ frame, fx, color, subpaths: groupedRows });
    return { ...written, subpaths: groupedRows };
  }

  warnSingleObservationGroups(onePass.groupRows, frame, warnings);
  return {
    positions: onePass.positions,
    rowIndex: onePass.rowIndex,
    pathOffsets: onePass.pathOffsets,
    strokes: onePass.strokes,
    subpaths: onePass.groupRows,
  };
}

export function lineBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
  options: { sortByX?: boolean } = {},
): PathsBatch | null {
  const { binding } = frame;

  const paint = layerPaintFromParams(binding.layer.params);
  const strokePaintResolved =
    paint.strokePaint === null
      ? undefined
      : resolveGradientPaint(paint.strokePaint, binding.index, "stroke");
  const glowResolved = paint.glow === null ? undefined : resolveGlow(paint.glow, binding.index);

  const wantSortByX = options.sortByX !== false && binding.layer.geom !== "path";
  const buffers = buildLineBuffers(frame, fx, color, styles, warnings, wantSortByX);
  if (buffers === null || buffers.subpaths.length === 0) return null;
  const { positions, rowIndex, frameRowIndex, pathOffsets, strokes, subpaths } = buffers;

  // Apply strokePaint solid fallback when a stroke is still null/theme-default.
  if (strokePaintResolved !== undefined) {
    for (let i = 0; i < strokes.length; i++) {
      strokes[i] ??= strokePaintResolved.fallback;
    }
  }

  // Keep geom checks inline so TS narrows layer.params (line/path vs quantile/function).
  const params =
    binding.layer.geom === "line" ||
    binding.layer.geom === "qq_line" ||
    binding.layer.geom === "path" ||
    binding.layer.geom === "step" ||
    binding.layer.geom === "quantile" ||
    binding.layer.geom === "contour" ||
    binding.layer.geom === "density_2d" ||
    binding.layer.geom === "sf" ||
    binding.layer.geom === "function"
      ? (binding.layer.params ?? {})
      : {};
  // Quantile/contour/density_2d/function have no curve param; line/path may set step/linear.
  // geom_step instead carries params.direction, which picks the step family (#789).
  let curve: PathsBatch["curve"] = "linear";
  if (binding.layer.geom === "step") {
    const direction = (binding.layer.params ?? {}).direction ?? "hv";
    curve = direction === "vh" ? "step-vh" : direction === "mid" ? "step" : "step-hv";
  } else if (binding.layer.geom === "line" || binding.layer.geom === "path") {
    curve = (binding.layer.params ?? {}).curve ?? "linear";
  }
  const styleRows = subpaths.map((rows) => rows[0]!);
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linetypeIndexes = indexedStyleVector(frame, "linetype", styleRows, styles, (value) =>
    linetypeIndex(value as Linetype),
  );
  const literalLinetype = binding.linetype.constant;
  const styleParams: { alpha?: number; linewidth?: number } = {};
  if ("linewidth" in params && typeof params.linewidth === "number") {
    styleParams.linewidth = params.linewidth;
  }
  if ("alpha" in params && typeof params.alpha === "number") {
    styleParams.alpha = params.alpha;
  }
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    ...(frameRowIndex !== undefined && { frameRowIndex }),
    pathOffsets,
    strokes,
    linewidth: constantStyle(binding, styleParams, "linewidth", DEFAULT_LINEWIDTH),
    ...(linewidths !== undefined && { linewidths }),
    alpha: alphas === undefined ? constantStyle(binding, styleParams, "alpha", 1) : 1,
    ...(alphas !== undefined && { alphas }),
    ...(typeof literalLinetype === "string" && { linetype: literalLinetype as Linetype }),
    ...(linetypeIndexes !== undefined && { linetypeIndexes }),
    curve,
    ...(strokePaintResolved !== undefined && { strokePaint: strokePaintResolved }),
    ...(glowResolved !== undefined && { glow: glowResolved }),
  };
}
