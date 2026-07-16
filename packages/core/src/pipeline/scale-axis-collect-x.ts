/**
 * Collect x-axis training evidence from a single layer frame.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import type { Advisory, LayerFrame } from "./types.js";

export interface AxisCollectAcc {
  columns: (readonly CellValue[])[];
  numeric: Float64Array[];
  anyDiscrete: boolean;
  allTemporal: boolean;
  sawContinuousEvidence: boolean;
  barMeasure: boolean;
  typeParts: Set<string>;
}

export function collectAxisInputsX(
  frame: LayerFrame,
  configType: PositionScaleSpec["type"] | undefined,
  advisories: Advisory[],
  acc: AxisCollectAcc,
): void {
  const { binding } = frame;
  const geom = binding.layer.geom;

  if (frame.xmin !== null && frame.xmax !== null) {
    // Binned bars: the x domain is the union of bin edges (continuous).
    acc.numeric.push(frame.xmin, frame.xmax);
    const field = binding.xField!;
    const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
    acc.typeParts.add(`binned ${fieldType}`);
    if (fieldType !== "temporal") acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (frame.xValues !== null || frame.xNumeric !== null) {
    if (frame.xValues !== null) acc.columns.push(frame.xValues);
    if (frame.xNumeric !== null) acc.numeric.push(frame.xNumeric);
    const field = binding.xField!;
    const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
    acc.typeParts.add(fieldType);
    const barX = (geom === "bar" || geom === "col") && binding.layer.stat !== "bin";
    if (barX && fieldType !== "nominal" && configType === undefined) {
      advisories.push({
        code: "bar-x-discretized",
        path: `layers.${binding.index}`,
        chosen: `x treated as discrete bands (${geom} geom)`,
        howToOverride: "Use point/line/area for continuous x, or set scales.x.type explicitly.",
      });
    }
    if (barX || fieldType === "nominal") acc.anyDiscrete = true;
    if (fieldType !== "temporal") acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  }
  if (frame.box !== null && frame.box.outlierX.length > 0) {
    acc.columns.push(frame.box.outlierX);
  }
  for (const v of frame.xIntercepts) {
    acc.columns.push([v]);
    acc.numeric.push(Float64Array.of(cellToNumber(v)));
    if (typeof v === "string" && !Number.isFinite(cellToNumber(v))) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
