/**
 * Pack smooth-stat result into a LayerFrame.
 */
import type { ColumnTable } from "../table.js";
import type { CellValue } from "../table.js";

import { type CarriedColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import type { LayerBinding, LayerFrame } from "./types.js";

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
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups,
    columns: {
      y: result.y,
      ...(result.ymin !== null && { ymin: result.ymin }),
      ...(result.ymax !== null && { ymax: result.ymax }),
      se: result.se,
    },
    columnOf: columnOf(result, null),
    lineage: "none",
    extras: {
      ymin: result.ymin,
      ymax: result.ymax,
      smooth: { band: result.hasBand },
    },
  });
}
