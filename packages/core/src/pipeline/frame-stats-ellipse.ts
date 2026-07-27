/**
 * Ellipse stat → LayerFrame (closed path rings per group).
 */
import type { ColumnTable } from "../table.js";

import { statEllipse, type StatEllipseParams } from "../stats/ellipse.js";
import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildEllipseFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as StatEllipseParams;
  const result = statEllipse({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before ellipse", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "ellipse-group-dropped",
      message: `Layer ${index} (ellipse): ${result.droppedGroups} group(s) with fewer than two finite points (or zero variance) have been dropped.`,
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
