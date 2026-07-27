/**
 * Sum stat → LayerFrame (point / count geom overplotting).
 */
import { statSum } from "../stats/sum.js";
import type { ColumnTable, CellValue } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn, positionValuesToNumeric } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

function positionCells(
  binding: LayerBinding,
  table: ColumnTable,
  axis: "x" | "y",
): readonly (CellValue | null)[] {
  const field = axis === "x" ? binding.xField! : binding.yField!;
  const conversion = axis === "x" ? binding.xConversion : binding.yConversion;
  const transform = axis === "x" ? binding.xTransform : binding.yTransform;
  // Continuous / temporal: null out non-finite after transform so sum drops them.
  const numeric = positionColumn(table, field, conversion, transform);
  const raw = table.column(field);
  return Array.from(numeric, (v, i) => {
    if (!Number.isFinite(v)) return null;
    // Preserve original cell for discrete keys when transform is identity.
    if (transform === undefined || transform.transform.key === "identity") {
      return raw[i]!;
    }
    return v;
  });
}

export function buildSumFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statSum({
    x: positionCells(binding, table, "x"),
    y: positionCells(binding, table, "y"),
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
  });
  removedStatWarning(
    result.dropped,
    index,
    "missing x/y or non-finite weight before summing",
    warnings,
  );

  const xNumeric = positionValuesToNumeric(result.x, binding.xConversion).values;
  const yNumeric = positionValuesToNumeric(result.y, binding.yConversion).values;
  const columns: Record<string, Float64Array> = { n: result.n, prop: result.prop };
  const col = columnOf(result, result.x);
  const outN = result.x.length;

  return {
    binding,
    table,
    n: outN,
    xValues: result.x,
    xNumeric,
    yValues: result.y,
    yNumeric,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
  };
}
