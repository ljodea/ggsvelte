/**
 * density_2d → LayerFrame of isoline vertices (#802).
 *
 * Path series keyed by (group × piece). after_stat level for tooltips.
 */
import type { Density2dParams } from "@ggsvelte/spec";

import { statDensity2d } from "../stats/density-2d.js";
import type { ColumnTable } from "../table.js";

import { carriedColumns, emptyFrameExtras, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf, styleColumns } from "./frame-stats-shared.js";
import { positionColumn } from "./temporal-position.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { NO_ROW } from "./types.js";

export function buildDensity2dFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statDensity2d({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
    params: (layer.params ?? {}) as Density2dParams,
  });
  removedStatWarning(
    result.dropped,
    index,
    "missing or non-finite x/y before density_2d",
    warnings,
  );
  if (result.droppedGroups > 0) {
    warnings.push({
      code: "density-2d-group-dropped",
      message: `Layer ${index} (density_2d): ${result.droppedGroups} group(s) with fewer than two points or no contours were dropped.`,
    });
  }

  // One path series per (source group × polyline piece) — levels stay in `level`.
  const pieceKey = new Map<string, number>();
  const outGroups: number[] = [];
  let next = 0;
  for (let i = 0; i < result.groups.length; i++) {
    const key = `${result.groups[i]!}\0${result.piece[i]!}\0${result.level[i]!}`;
    let id = pieceKey.get(key);
    if (id === undefined) {
      id = next++;
      pieceKey.set(key, id);
    }
    outGroups.push(id);
  }

  const col = columnOf(result, null);
  const outN = result.x.length;
  return {
    binding,
    table,
    n: outN,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric: result.y,
    groups: outGroups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, { level: result.level, density: result.density }),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
  };
}
