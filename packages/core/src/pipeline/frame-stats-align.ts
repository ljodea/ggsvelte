/**
 * Align stat → LayerFrame (shared x grid + interpolated y per group).
 */
import type { ColumnTable } from "../table.js";

import { statAlign } from "../stats/align.js";
import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildAlignFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statAlign({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before align", warnings);
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
