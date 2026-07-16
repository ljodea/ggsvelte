/**
 * Count / bin / density stat → LayerFrame branches.
 */
import type { BarParams } from "@ggsvelte/spec";

import { statBin } from "../stats/bin.js";
import { statCount } from "../stats/count.js";
import { statDensity } from "../stats/density.js";
import { cellsToNumeric, ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildCountFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
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

export function buildBinFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
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

export function buildDensityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
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
