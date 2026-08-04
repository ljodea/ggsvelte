/**
 * summary_rolling → LayerFrame (one row per group × unique x; running-line y).
 *
 * Scale-space: x centers are already transformed (like stat_summary_bin);
 * y is not re-forwarded (summary values live in measure space).
 */
import type { ColumnTable } from "../table.js";

import { statSummaryRolling, type SummaryRollingParamsInput } from "../stats/summary-rolling.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildSummaryRollingFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  _advisories: Advisory[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statSummaryRolling({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
    params: (layer.params ?? {}) as SummaryRollingParamsInput,
  });
  removedStatWarning(
    result.dropped,
    index,
    "missing/non-finite x or y before summary_rolling",
    warnings,
  );
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns: {
      y: result.y,
    },
    columnOf: columnOf(result, null),
    lineage: "none",
    extras: {},
  });
}
