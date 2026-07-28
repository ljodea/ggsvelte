/**
 * Pack bin-stat result into a LayerFrame.
 */
import type { ColumnTable } from "../table.js";

import { type makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import type { LayerBinding, LayerFrame } from "./types.js";

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
  cut: { fuzzy: readonly number[]; rightClosed: boolean; binIndex: Int32Array };
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
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { column: "count", fallback: result.count },
    groups: result.groups,
    inputGroups,
    columns,
    columnOf: columnOf(result, null),
    lineage: "none",
    extras: {
      // Lineage replays the stat's own cut instead of re-deriving from edges (#905).
      binCut: result.cut,
      xmin: result.xmin,
      xmax: result.xmax,
    },
  });
}
