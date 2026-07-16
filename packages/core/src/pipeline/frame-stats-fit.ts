/**
 * Smooth / boxplot / summary stat → LayerFrame branches.
 */
import type { BoxplotParams, ErrorbarParams, SmoothParams } from "@ggsvelte/spec";

import { statBoxplot } from "../stats/boxplot.js";
import { statSmooth } from "../stats/smooth.js";
import { statSummary } from "../stats/summary.js";
import { cellsToNumeric, ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildSmoothFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as SmoothParams;
  const result = statSmooth({
    x: table.numeric(binding.xField!),
    y: table.numeric(binding.yField!),
    groups,
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "smooth-group-dropped",
      message: `Layer ${index} (smooth): ${result.droppedGroups} group(s) too small or degenerate to fit have been dropped.`,
    });
  }
  if (result.methodInferred && result.x.length > 0) {
    advisories.push({
      code: "smooth-method-inferred",
      path: `layers.${index}`,
      chosen: `stat smooth using method = "${result.methodUsed}" (largest group ${result.methodUsed === "loess" ? "<" : ">="} 1000 rows; ggplot2 would escalate to gam, which ggsvelte does not ship)`,
      howToOverride: `Set params.method ("lm" | "loess") on layer ${index}.`,
    });
  }
  const col = columnOf(result, null);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: null,
    xNumeric: result.x,
    yNumeric: result.y,
    groups: result.groups,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    ymin: result.ymin,
    ymax: result.ymax,
    smoothBand: result.hasBand,
  };
}

export function buildBoxplotFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as BoxplotParams;
  const result = statBoxplot({
    x: table.column(binding.xField!),
    y: table.numeric(binding.yField!),
    groups,
    ...(params.coef !== undefined && { coef: params.coef }),
    carried,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite y", warnings);
  const col = columnOf(result, result.x);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: result.x,
    xNumeric: null,
    yNumeric: null,
    groups: result.groups,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    ymin: result.ymin,
    ymax: result.ymax,
    box: {
      lower: result.lower,
      middle: result.middle,
      upper: result.upper,
      outlierX: result.outliers.map((o) => o.x),
      outlierY: Float64Array.from(result.outliers.map((o) => o.y)),
      outlierBox: Uint32Array.from(result.outliers.map((o) => o.boxRow)),
      outlierRow: Uint32Array.from(result.outliers.map((o) => o.sourceRow)),
    },
  };
}

export function buildSummaryFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as ErrorbarParams;
  const result = statSummary({
    x: table.column(binding.xField!),
    y: table.numeric(binding.yField!),
    groups,
    fun: params.fun,
    funMin: params.funMin,
    funMax: params.funMax,
    carried,
  });
  removedStatWarning(result.dropped, index, "missing x or non-finite y", warnings);
  const col = columnOf(result, result.x);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: result.x,
    xNumeric: cellsToNumeric(result.x),
    yNumeric: result.y,
    groups: result.groups,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    ymin: result.ymin,
    ymax: result.ymax,
  };
}
