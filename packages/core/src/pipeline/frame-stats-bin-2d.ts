/**
 * bin_2d stat → LayerFrame with rectangular bin edges for edgeRectsBatch.
 */
import type { ColumnTable } from "../table.js";

import { statBin2d } from "../stats/bin-2d.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { colorColumns, makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildBin2dFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as {
    bins?: number;
    binwidth?: number;
    drop?: boolean;
  };
  const result = statBin2d({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    weights: binding.weightField === null ? null : table.numeric(binding.weightField),
    carried,
    params,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before bin_2d", warnings);
  if (result.usedDefaultBins && result.x.length > 0) {
    advisories.push({
      code: "bin-default-bins",
      path: `layers.${index}`,
      chosen: "stat bin_2d using bins = 30",
      howToOverride: `Set params.bins or params.binwidth on layer ${index}.`,
    });
  }

  const columns: Record<string, Float64Array> = {
    count: result.count,
    density: result.density,
    ncount: result.ncount,
    ndensity: result.ndensity,
  };
  const col = columnOf(result, null);

  return {
    binding,
    table,
    n: result.x.length,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    // after_stat color/fill (default fill = count; #799 / #953).
    ...colorColumns(binding, col, columns),
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    xmin: result.xmin,
    xmax: result.xmax,
    ymin: result.ymin,
    ymax: result.ymax,
  };
}
