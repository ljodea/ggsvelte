/**
 * Ellipse stat → LayerFrame (closed path rings per group).
 */
import type { ColumnTable } from "../table.js";

import { statEllipse, type StatEllipseParams } from "../stats/ellipse.js";
import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

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
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns: { x: result.x, y: result.y },
    columnOf: columnOf(result, null),
    lineage: "none",
  });
}
