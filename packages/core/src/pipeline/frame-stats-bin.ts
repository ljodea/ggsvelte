/**
 * Bin (histogram) stat → LayerFrame with shared or free break grids.
 */
import type { BarParams } from "@ggsvelte/spec";

import { statBin } from "../stats/bin.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

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
