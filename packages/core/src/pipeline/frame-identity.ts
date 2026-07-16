/**
 * Identity-stat LayerFrame (source columns, optional ymin/ymax).
 */
import type { ColumnTable } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import type { LayerBinding, LayerFrame } from "./types.js";

export function buildIdentityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: number[],
): LayerFrame {
  const n = table.rowCount;
  return {
    binding,
    table,
    n,
    xValues: binding.xField === null ? null : table.column(binding.xField),
    xNumeric: binding.xField === null ? null : table.numeric(binding.xField),
    yNumeric: binding.yField === null ? null : table.numeric(binding.yField),
    groups,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    colorValues: binding.color.field === null ? null : table.column(binding.color.field),
    fillValues: binding.fill.field === null ? null : table.column(binding.fill.field),
    labelValues: binding.labelField === null ? null : table.column(binding.labelField),
    ...emptyFrameExtras(),
    ymin: binding.yminField === null ? null : table.numeric(binding.yminField),
    ymax: binding.ymaxField === null ? null : table.numeric(binding.ymaxField),
  };
}
