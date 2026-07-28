/**
 * Sum stat → LayerFrame (point / count geom overplotting).
 */
import { statSum } from "../stats/sum.js";
import type { ColumnTable, CellValue } from "../table.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import {
  positionColumn,
  positionDiscreteness,
  positionValuesToNumeric,
} from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

function positionCells(
  binding: LayerBinding,
  table: ColumnTable,
  axis: "x" | "y",
): readonly (CellValue | null)[] {
  const field = axis === "x" ? binding.xField! : binding.yField!;
  const conversion = axis === "x" ? binding.xConversion : binding.yConversion;
  const transform = axis === "x" ? binding.xTransform : binding.yTransform;
  const raw = table.column(field);
  // Discrete axes have no finite numeric form — text categories come back NaN,
  // so keying them on the numeric column would drop every row (#795). Key them
  // on the raw cell like the count stat does, dropping only true nulls.
  if (positionDiscreteness(table, field, conversion) === "discrete") {
    return Array.from(raw, (cell) => cell ?? null);
  }
  // Continuous / temporal: null out non-finite after transform so sum drops them.
  const numeric = positionColumn(table, field, conversion, transform);
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

  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { values: result.x, numeric: xNumeric },
    y: { values: result.y, numeric: yNumeric },
    groups: result.groups,
    inputGroups: groups,
    columns,
    columnOf: columnOf(result, result.x),
    lineage: "none",
  });
}
