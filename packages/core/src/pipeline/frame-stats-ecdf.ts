/**
 * Ecdf stat → LayerFrame (paths / step-hv line).
 */
import { statEcdf } from "../stats/ecdf.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildEcdfFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as { pad?: boolean; n?: number };
  const result = statEcdf({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    groups,
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x", warnings);
  const columns: Record<string, Float64Array> = { ecdf: result.ecdf };
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { column: "ecdf", fallback: result.ecdf },
    groups: result.groups,
    inputGroups: groups,
    columns,
    columnOf: columnOf(result, null),
    lineage: "none",
  });
}
