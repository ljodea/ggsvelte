/**
 * Ecdf stat → LayerFrame (paths / step-hv line).
 */
import { statEcdf } from "../stats/ecdf.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

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
  const yNumeric = forwardMeasureOnce(
    columns[binding.yStatColumn ?? "ecdf"] ?? result.ecdf,
    binding.yTransform,
  );
  const col = columnOf(result, null);
  const outN = result.x.length;
  return {
    binding,
    table,
    n: outN,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
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
