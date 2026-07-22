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
    sizeValues: binding.size.field === null ? null : table.column(binding.size.field),
    linewidthValues:
      binding.linewidth.field === null ? null : table.column(binding.linewidth.field),
    alphaValues: binding.alpha.field === null ? null : table.column(binding.alpha.field),
    shapeValues: binding.shape.field === null ? null : table.column(binding.shape.field),
    linetypeValues: binding.linetype.field === null ? null : table.column(binding.linetype.field),
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
    // Only ribbon (and stats that write xmin/xmax themselves) consume these
    // fields — do not populate them for unrelated geoms that happen to map
    // xmin/xmax, or scale collection treats the layer as edge/bin evidence.
    xmin:
      (binding.layer.geom === "rect" || binding.layer.geom === "ribbon") &&
      binding.xminField !== null
        ? positionNumeric(
            table,
            binding.xminField,
            binding.xConversion,
            binding.xTransform,
            binding.xBinning,
          )
        : null,
    xmax:
      (binding.layer.geom === "rect" || binding.layer.geom === "ribbon") &&
      binding.xmaxField !== null
        ? positionNumeric(
            table,
            binding.xmaxField,
            binding.xConversion,
            binding.xTransform,
            binding.xBinning,
          )
        : null,
    // Segment only — keep xend/yend off other geoms so scale training stays clean.
    xend:
      binding.layer.geom === "segment" && binding.xendField !== null
        ? positionNumeric(
            table,
            binding.xendField,
            binding.xConversion,
            binding.xTransform,
            binding.xBinning,
          )
        : null,
    yend:
      binding.layer.geom === "segment" && binding.yendField !== null
        ? positionNumeric(
            table,
            binding.yendField,
            binding.yConversion,
            binding.yTransform,
            binding.yBinning,
          )
        : null,
    xendValues:
      binding.layer.geom === "segment" && binding.xendField !== null
        ? table.column(binding.xendField)
        : null,
    yendValues:
      binding.layer.geom === "segment" && binding.yendField !== null
        ? table.column(binding.yendField)
        : null,
  };
}
