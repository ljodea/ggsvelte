/**
 * Pack bin-stat result into a LayerFrame.
 */
import type { ColumnTable } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import { styleColumns, type makeColumnOf } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import type { LayerBinding, LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";

type BinResult = {
  x: Float64Array;
  count: Float64Array;
  density: Float64Array;
  ncount: Float64Array;
  ndensity: Float64Array;
  groups: number[];
  xmin: Float64Array;
  xmax: Float64Array;
  carried: Record<string, import("../table.js").CellValue[]>;
};

export function packBinLayerFrame(
  binding: LayerBinding,
  table: ColumnTable,
  result: BinResult,
  columnOf: ReturnType<typeof makeColumnOf>,
  inputGroups: readonly number[],
): LayerFrame {
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
    yNumeric: forwardMeasureOnce(
      columns[binding.yStatColumn ?? "count"] ?? result.count,
      binding.yTransform,
    ),
    groups: result.groups,
    inputGroups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, columns),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    xmin: result.xmin,
    xmax: result.xmax,
  };
}
