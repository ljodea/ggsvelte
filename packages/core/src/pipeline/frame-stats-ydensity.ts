/**
 * ydensity stat → LayerFrame (violin polygons from mirrored density).
 */
import type { ViolinParams } from "@ggsvelte/spec";

import { statYDensity } from "../stats/ydensity.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildYDensityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const params = (layer.params ?? {}) as ViolinParams;
  const result = statYDensity({
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    x: table.column(binding.xField!),
    groups,
    carried,
    params: {
      ...(params.bw !== undefined && { bw: params.bw }),
      ...(params.adjust !== undefined && { adjust: params.adjust }),
      ...(params.n !== undefined && { n: params.n }),
      ...(params.trim !== undefined && { trim: params.trim }),
      ...(params.scale !== undefined && { scale: params.scale }),
    },
  });
  removedStatWarning(result.dropped, index, "missing or non-finite y", warnings);
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "ydensity-group-dropped",
      message: `Layer ${index} (ydensity): ${result.droppedGroups} group(s) with fewer than two data points have been dropped.`,
    });
  }
  const col = columnOf(result, result.x);
  const outN = result.y.length;
  return {
    binding,
    table,
    n: outN,
    xValues: result.x,
    xNumeric: null,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, {
      density: result.density,
      scaled: result.scaled,
      count: result.count,
      violinwidth: result.violinwidth,
    }),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    // ymin stashes violinwidth (unitless 0–1 × scale factor) for geometry-violin.
    xmin: null,
    xmax: null,
    ymin: result.violinwidth,
    ymax: result.violinwidth,
  };
}
