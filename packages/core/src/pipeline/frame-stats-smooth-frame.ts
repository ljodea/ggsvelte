/**
 * Pack smooth-stat result into a LayerFrame.
 */
import type { ColumnTable } from "../table.js";
import type { CellValue } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import { styleColumns, type CarriedColumnOf } from "./frame-stats-shared.js";
import type { LayerBinding, LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";

type SmoothResult = {
  x: Float64Array;
  y: Float64Array;
  ymin: Float64Array | null;
  ymax: Float64Array | null;
  se: Float64Array;
  groups: number[];
  hasBand: boolean;
  carried: Record<string, CellValue[]>;
};

export function packSmoothLayerFrame(
  binding: LayerBinding,
  table: ColumnTable,
  result: SmoothResult,
  columnOf: CarriedColumnOf,
  inputGroups: readonly number[],
): LayerFrame {
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
    inputGroups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
    colorValues: col(binding.color.field),
    fillValues: col(binding.fill.field),
    ...styleColumns(binding, col, {
      y: result.y,
      ...(result.ymin !== null && { ymin: result.ymin }),
      ...(result.ymax !== null && { ymax: result.ymax }),
      se: result.se,
    }),
    labelValues: col(binding.labelField),
    ...emptyFrameExtras(),
    ymin: result.ymin,
    ymax: result.ymax,
    smooth: { band: result.hasBand },
  };
}
