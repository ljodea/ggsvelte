/**
 * stat_sf_coordinates (#809 phase 2 + multi-part labels phase 5):
 * one (x,y) per geometry part from portable GeoJSON (Multi* expands).
 */
import { ColumnTable, type CellValue } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import {
  geometryFieldName,
  parseSfGeometry,
  representativePoints,
  sfKindOf,
} from "./sf-geometry.js";
import type { LayerBinding, LayerFrame, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

function styleColumn(
  table: ColumnTable,
  field: string | null,
  valueRows: readonly number[],
): readonly CellValue[] | null {
  if (field === null) return null;
  const col = table.column(field);
  return valueRows.map((row) => col[row]!);
}

export function buildSfCoordinatesFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { layer, index } = binding;
  const params = (layer.params ?? {}) as { geometry?: string };
  const field = geometryFieldName(params);
  if (!table.has(field)) {
    throw new PipelineError(
      "sf-geometry-missing",
      `/layers/${index}/params/geometry`,
      `stat_sf_coordinates requires a geometry column "${field}" of GeoJSON Geometry JSON strings.`,
    );
  }

  const geomCol = table.column(field);
  const outX: number[] = [];
  const outY: number[] = [];
  const outGroups: number[] = [];
  const outRowIndex: number[] = [];
  const valueRows: number[] = [];
  let dropped = 0;

  for (let row = 0; row < table.rowCount; row++) {
    const parsed = parseSfGeometry(geomCol[row]!, `/layers/${index}/data/${field}`);
    // Validate type is in the supported family (throws on GeometryCollection).
    sfKindOf(parsed.type);
    const pts = representativePoints(parsed.type, parsed.coordinates);
    if (pts.length === 0) {
      // One drop per input feature with no usable part (not per empty part).
      dropped++;
      continue;
    }
    for (const pt of pts) {
      outX.push(pt[0]);
      outY.push(pt[1]);
      outGroups.push(groups[row] ?? 0);
      outRowIndex.push(row);
      valueRows.push(row);
    }
  }

  if (dropped > 0) {
    warnings.push({
      code: "sf-coordinates-dropped",
      message: `Layer ${index} (sf_coordinates): dropped ${dropped} feature(s) with no finite representative point.`,
    });
  }

  if (outX.length === 0) {
    throw new PipelineError(
      "sf-geometry-invalid",
      `/layers/${index}`,
      "stat_sf_coordinates produced no finite representative points from the geometry column.",
    );
  }

  return {
    binding,
    table,
    n: outX.length,
    xValues: null,
    xNumeric: Float64Array.from(outX),
    yValues: null,
    yNumeric: Float64Array.from(outY),
    groups: outGroups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from(outRowIndex),
    colorValues: styleColumn(table, binding.color.field, valueRows),
    fillValues: styleColumn(table, binding.fill.field, valueRows),
    sizeValues: styleColumn(table, binding.size.field, valueRows),
    linewidthValues: styleColumn(table, binding.linewidth.field, valueRows),
    alphaValues: styleColumn(table, binding.alpha.field, valueRows),
    shapeValues: styleColumn(table, binding.shape.field, valueRows),
    linetypeValues: styleColumn(table, binding.linetype.field, valueRows),
    labelValues: styleColumn(table, binding.labelField, valueRows),
    ...emptyFrameExtras(),
  };
}
