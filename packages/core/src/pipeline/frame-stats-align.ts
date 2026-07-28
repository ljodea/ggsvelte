/**
 * Align stat → LayerFrame (shared x grid + interpolated y per group).
 */
import type { ColumnTable } from "../table.js";

import { statAlign } from "../stats/align.js";
import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

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
