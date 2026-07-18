/**
 * Count stat → LayerFrame.
 */
import { statCount } from "../stats/count.js";
import { cellsToNumeric, ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
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
    inputGroups: groups,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
  };
}
