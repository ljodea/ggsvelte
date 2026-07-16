/**
 * Density stat → LayerFrame (area from zero baseline).
 */
import { statDensity } from "../stats/density.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildDensityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statDensity({
    x: table.numeric(binding.xField!),
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
    params: (layer.params ?? {}) as { bw?: number; adjust?: number; n?: number; cut?: number },
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "density-group-dropped",
      message: `Layer ${index} (density): ${result.droppedGroups} group(s) with fewer than two data points have been dropped.`,
    });
  }
  const columns: Record<string, Float64Array> = {
    density: result.density,
    count: result.count,
    scaled: result.scaled,
    ndensity: result.ndensity,
  };
  const yNumeric = columns[binding.yStatColumn ?? "density"] ?? result.density;
  const col = columnOf(result, null);
  const outN = result.x.length;
  return {
    binding,
    table,
    n: outN,
    xValues: null,
    xNumeric: result.x,
    yNumeric,
    groups: result.groups,
    rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    // Density renders as an area from the zero baseline.
    ymin: new Float64Array(outN),
    ymax: yNumeric,
  };
}
