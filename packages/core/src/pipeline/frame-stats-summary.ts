/**
 * Summary stat → LayerFrame (y/ymin/ymax for errorbars and related geoms).
 */
import type { ErrorbarParams } from "@ggsvelte/spec";

import { statSummary } from "../stats/summary.js";
import { cellsToNumeric, ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

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
