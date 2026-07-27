/**
 * qq / qq_line stats → LayerFrame (points or 2-point line).
 */
import type { ColumnTable } from "../table.js";

import { statQq, statQqLine } from "../stats/qq.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

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
  const col = columnOf(result, null);
  const n = result.theoretical.length;
  return {
    binding,
    table,
    n,
    xValues: null,
    xNumeric: result.theoretical,
    yValues: null,
    yNumeric: result.sample,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: n }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
  };
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
