/**
 * Boxplot stat → LayerFrame (hinges, whiskers, outliers).
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import { statBoxplot } from "../stats/boxplot.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

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
