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

  // Continuous multi-series hot path (#1468): one normalize+pixel pass that also
  // buckets by group. Skipped when stroke style is per-vertex (style split) or
  // scales are band — falls through to the classic bucket → sort → write path.
  const wantSortByX = options.sortByX !== false && binding.layer.geom !== "path";
  let positions: Float32Array;
  let rowIndex: Uint32Array;
  let frameRowIndex: Uint32Array | undefined;
  let pathOffsets: Uint32Array;
  let strokes: (string | null)[];
  let subpaths: readonly (readonly number[])[];

  const onePass =
    !hasMappedStrokeStyle(frame) &&
    fx.xScale.type !== "band" &&
    fx.yScale.type !== "band" &&
    frame.xNumeric !== null &&
    frame.yNumeric !== null
      ? writeContinuousLineOnePass({ frame, fx, color, warnings })
      : null;

  if (onePass !== null) {
    // If x within any group is out of order, fall back so sortGroupRowsByX +
    // write stay correct (one-pass pixels would desync after a row reorder).
    let needsSort = false;
    if (wantSortByX) {
      const x = frame.xNumeric!;
      for (const rows of onePass.groupRows) {
        for (let i = 1; i < rows.length; i++) {
          if (!(x[rows[i]!]! >= x[rows[i - 1]!]!)) {
            needsSort = true;
            break;
          }
        }
        if (needsSort) break;
      }
    }
    if (needsSort) {
      // Pixels from one-pass discarded; re-write after x-sort.
      const groupedRows = onePass.groupRows.map((rows) => rows.slice());
      sortGroupRowsByX(groupedRows, frame, fx);
      warnSingleObservationGroups(groupedRows, frame, warnings);
      subpaths = groupedRows;
      ({ positions, rowIndex, frameRowIndex, pathOffsets, strokes } = writeLineSubpaths({
        frame,
        fx,
        color,
        subpaths,
      }));
    } else {
      warnSingleObservationGroups(onePass.groupRows, frame, warnings);
      positions = onePass.positions;
      rowIndex = onePass.rowIndex;
      pathOffsets = onePass.pathOffsets;
      strokes = onePass.strokes;
      subpaths = onePass.groupRows;
    }
  } else {
    const groupedRows = bucketByGroup(frame, fx, null, warnings);
    if (groupedRows.length === 0) return null;
    warnSingleObservationGroups(groupedRows, frame, warnings);
    // geom_line sorts by x; geom_path keeps data/row order (#788).
    if (wantSortByX) {
      sortGroupRowsByX(groupedRows, frame, fx);
    }
    subpaths = splitStyleSubpaths(frame, groupedRows, styles);
    const styleSplit = subpaths.length > groupedRows.length;
    ({ positions, rowIndex, frameRowIndex, pathOffsets, strokes } = writeLineSubpaths({
      frame,
      fx,
      color,
      subpaths,
      includeFrameRows: styleSplit,
    }));
  }

  if (subpaths.length === 0) return null;

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
