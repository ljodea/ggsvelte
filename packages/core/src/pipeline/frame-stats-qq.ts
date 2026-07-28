/**
 * qq / qq_line stats → LayerFrame (points or 2-point line).
 */
import type { ColumnTable } from "../table.js";

import { statQq, statQqLine } from "../stats/qq.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

function packQqFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  result: {
    theoretical: Float64Array;
    sample: Float64Array;
    groups: number[];
    carried: Record<string, import("../table.js").CellValue[]>;
    dropped: number;
  },
  warnings: PipelineWarning[],
  dropLabel: string,
): LayerFrame {
  removedStatWarning(result.dropped, binding.index, dropLabel, warnings);
  const columnOf = makeColumnOf(binding);
  const columns: Record<string, Float64Array> = {
    theoretical: result.theoretical,
    sample: result.sample,
  };
  return statLayerFrame({
    binding,
    table,
    n: result.theoretical.length,
    x: { numeric: result.theoretical },
    y: { numeric: result.sample },
    groups: result.groups,
    inputGroups: groups,
    columns,
    columnOf: columnOf(result, null),
    lineage: "none",
  });
}

export function buildQqFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  if (binding.sampleField === null) {
    return packQqFrame(
      binding,
      table,
      groups,
      {
        theoretical: new Float64Array(0),
        sample: new Float64Array(0),
        groups: [],
        carried: {},
        dropped: 0,
      },
      warnings,
      "missing sample",
    );
  }
  const carried = carriedColumns(binding, table);
  const result = statQq({
    sample: table.numeric(binding.sampleField),
    groups,
    carried,
  });
  return packQqFrame(binding, table, groups, result, warnings, "missing or non-finite sample");
}

export function buildQqLineFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  if (binding.sampleField === null) {
    return packQqFrame(
      binding,
      table,
      groups,
      {
        theoretical: new Float64Array(0),
        sample: new Float64Array(0),
        groups: [],
        carried: {},
        dropped: 0,
      },
      warnings,
      "missing sample",
    );
  }
  const carried = carriedColumns(binding, table);
  const result = statQqLine({
    sample: table.numeric(binding.sampleField),
    groups,
    carried,
  });
  return packQqFrame(binding, table, groups, result, warnings, "missing or non-finite sample");
}
