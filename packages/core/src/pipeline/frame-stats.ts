/**
 * Non-identity stat branches for LayerFrame construction (count/bin/density/
 * smooth/boxplot/summary). Returns null for identity so the caller can fall through.
 */
import type { BarParams, BoxplotParams, ErrorbarParams, SmoothParams } from "@ggsvelte/spec";

import { statBin } from "../stats/bin.js";
import { statBoxplot } from "../stats/boxplot.js";
import { statCount } from "../stats/count.js";
import { statDensity } from "../stats/density.js";
import { statSmooth } from "../stats/smooth.js";
import { statSummary } from "../stats/summary.js";
import type { CellValue } from "../table.js";
import { cellsToNumeric, ColumnTable } from "../table.js";

import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";
import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";

export function buildNonIdentityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame | null {
  const { layer, index } = binding;
  const stat = layer.stat ?? "identity";
  if (stat === "identity") return null;

  const carried = carriedColumns(binding, table);
  const columnOf =
    (result: { carried: Record<string, CellValue[]> }, x: readonly CellValue[] | null) =>
    (field: string | null): readonly CellValue[] | null =>
      field === null ? null : field === binding.xField ? x : (result.carried[field] ?? null);

  if (stat === "count") {
    const xField = binding.xField!;
    const result = statCount({
      x: table.column(xField),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
    });
    removedStatWarning(
      result.dropped,
      index,
      "missing x or non-finite weight before counting",
      warnings,
    );
    const col = columnOf(result, result.x);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: result.x,
      xNumeric: cellsToNumeric(result.x),
      yNumeric: binding.yStatColumn === "count" ? result.count : null,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
    };
  }

  if (stat === "bin") {
    const result = statBin({
      x: table.numeric(binding.xField!),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
      params: (layer.params ?? {}) as BarParams,
      // Fixed-x facets share one break grid across panels (ggplot2 derives
      // breaks from the shared scale dimension); free_x omits this.
      ...(binRange !== undefined && { range: binRange }),
    });
    removedStatWarning(result.dropped, index, "missing or non-finite x before binning", warnings);
    if (result.usedDefaultBins && result.x.length > 0) {
      // Hadley lesson 12 — the model advisory: geom_histogram's
      // "`stat_bin()` using `bins = 30`. Pick better value with `binwidth`."
      advisories.push({
        code: "bin-default-bins",
        path: `layers.${index}`,
        chosen: "stat bin using bins = 30",
        howToOverride: `Set params.binwidth (preferred — a width meaningful for the data) or params.bins on layer ${index}.`,
      });
    }
    const columns: Record<string, Float64Array> = {
      count: result.count,
      density: result.density,
      ncount: result.ncount,
      ndensity: result.ndensity,
    };
    const col = columnOf(result, null);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: null,
      xNumeric: result.x,
      yNumeric: columns[binding.yStatColumn ?? "count"] ?? result.count,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      xmin: result.xmin,
      xmax: result.xmax,
    };
  }

  if (stat === "density") {
    const result = statDensity({
      x: table.numeric(binding.xField!),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
      params: (layer.params ?? {}) as { bw?: number; adjust?: number; n?: number; cut?: number },
    });
    removedStatWarning(result.dropped, index, "missing or non-finite x", warnings);
    if (result.droppedGroups > 0) {
      warnings.push({
        code: "density-group-dropped",
        message: `Layer ${index} (density): ${result.droppedGroups} group(s) with fewer than two data points have been dropped.`,
      });
    }
    const columns: Record<string, Float64Array> = {
      density: result.density,
      count: result.count,
      scaled: result.scaled,
      ndensity: result.ndensity,
    };
    const yNumeric = columns[binding.yStatColumn ?? "density"] ?? result.density;
    const col = columnOf(result, null);
    const outN = result.x.length;
    return {
      binding,
      table,
      n: outN,
      xValues: null,
      xNumeric: result.x,
      yNumeric,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      // Density renders as an area from the zero baseline.
      ymin: new Float64Array(outN),
      ymax: yNumeric,
    };
  }

  if (stat === "smooth") {
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

  if (stat === "boxplot") {
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

  if (stat === "summary") {
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

  return null;
}
