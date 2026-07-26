/**
 * Quantile stat → LayerFrame (linear RQ lines per group × τ).
 */
import type { QuantileParams } from "@ggsvelte/spec";

import { normalizeQuantiles, statQuantile } from "../stats/quantile.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildQuantileFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as QuantileParams;
  const quantiles = normalizeQuantiles(params.quantiles);
  if (quantiles.length === 0) {
    warnings.push({
      code: "quantile-empty",
      message: `Layer ${index} (quantile): no valid quantiles in (0,1); nothing drawn.`,
    });
  }
  const result = statQuantile({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    quantiles,
    ...(params.n !== undefined && { n: params.n }),
    carried,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before quantile", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "quantile-group-dropped",
      message: `Layer ${index} (quantile): ${result.droppedGroups} group(s) too small or degenerate (constant x) were dropped.`,
    });
  }
  const col = columnOf(result, null);
  return {
    binding,
    table,
    n: result.x.length,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, { x: result.x, y: result.y }),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
  };
}
