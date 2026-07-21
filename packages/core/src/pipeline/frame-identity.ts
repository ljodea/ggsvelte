/**
 * Identity-stat LayerFrame (source columns, optional ymin/ymax).
 */
import type { ColumnTable } from "../table.js";

import { binIdColumn, snapColumnToBins, type BinnedBoundaries } from "./binned-scale.js";
import { emptyFrameExtras } from "./frame-helpers.js";
import { positionColumn } from "./temporal-position.js";
import type { ColumnTransformConfig } from "../scales/transform.js";
import type { PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding, LayerFrame } from "./types.js";

/**
 * Read one field into transformed scale-space, then (when binned) snap to the
 * bin's transformed center. Identity marks render at the center while keeping
 * the raw source value for tooltips (`xValues`/`yValues`, untouched here).
 */
function positionNumeric(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
  transform: ColumnTransformConfig | undefined,
  binning: BinnedBoundaries | undefined,
): Float64Array {
  return snapColumnToBins(positionColumn(table, field, conversion, transform), binning);
}

/** Stable integer bin id per row for a binned field (null when unbinned). */
function binIdOf(
  table: ColumnTable,
  field: string,
  conversion: PositionConversionContext,
  transform: ColumnTransformConfig | undefined,
  binning: BinnedBoundaries | undefined,
): Int32Array | null {
  if (binning === undefined) return null;
  return binIdColumn(positionColumn(table, field, conversion, transform), binning);
}

export function buildIdentityFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
): LayerFrame {
  const n = table.rowCount;
  return {
    binding,
    table,
    n,
    xValues: binding.xField === null ? null : table.column(binding.xField),
    xNumeric:
      binding.xField === null
        ? null
        : positionNumeric(
            table,
            binding.xField,
            binding.xConversion,
            binding.xTransform,
            binding.xBinning,
          ),
    yValues: binding.yField === null ? null : table.column(binding.yField),
    yNumeric:
      binding.yField === null
        ? null
        : positionNumeric(
            table,
            binding.yField,
            binding.yConversion,
            binding.yTransform,
            binding.yBinning,
          ),
    groups,
    inputGroups: groups,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    colorValues: binding.color.field === null ? null : table.column(binding.color.field),
    fillValues: binding.fill.field === null ? null : table.column(binding.fill.field),
    labelValues: binding.labelField === null ? null : table.column(binding.labelField),
    ...emptyFrameExtras(),
    xBinId:
      binding.xField === null
        ? null
        : binIdOf(table, binding.xField, binding.xConversion, binding.xTransform, binding.xBinning),
    yBinId:
      binding.yField === null
        ? null
        : binIdOf(table, binding.yField, binding.yConversion, binding.yTransform, binding.yBinning),
    ymin:
      binding.yminField === null
        ? null
        : positionNumeric(
            table,
            binding.yminField,
            binding.yConversion,
            binding.yTransform,
            binding.yBinning,
          ),
    ymax:
      binding.ymaxField === null
        ? null
        : positionNumeric(
            table,
            binding.ymaxField,
            binding.yConversion,
            binding.yTransform,
            binding.yBinning,
          ),
  };
}
