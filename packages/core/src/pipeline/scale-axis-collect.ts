/**
 * Collect per-axis training evidence across layer frames.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import { cellToNumber } from "../table.js";

import type { AxisInputs } from "./scale-axis-train.js";
import { isBarLike } from "./scale-axis-train.js";
import type { Advisory, LayerFrame } from "./types.js";

/** Collect per-axis training evidence across layers. */
export function collectAxisInputs(
  axis: "x" | "y",
  frames: readonly LayerFrame[],
  configType: PositionScaleSpec["type"] | undefined,
  advisories: Advisory[],
): AxisInputs {
  const columns: (readonly CellValue[])[] = [];
  const numeric: Float64Array[] = [];
  let anyDiscrete = false;
  let allTemporal = true;
  let sawContinuousEvidence = false;
  let barMeasure = false;
  const typeParts = new Set<string>();

  for (const frame of frames) {
    const { binding } = frame;
    const geom = binding.layer.geom;

    if (axis === "x") {
      if (frame.xmin !== null && frame.xmax !== null) {
        // Binned bars: the x domain is the union of bin edges (continuous).
        numeric.push(frame.xmin, frame.xmax);
        const field = binding.xField!;
        const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
        typeParts.add(`binned ${fieldType}`);
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      } else if (frame.xValues !== null || frame.xNumeric !== null) {
        if (frame.xValues !== null) columns.push(frame.xValues);
        if (frame.xNumeric !== null) numeric.push(frame.xNumeric);
        const field = binding.xField!;
        const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
        typeParts.add(fieldType);
        const barX = (geom === "bar" || geom === "col") && binding.layer.stat !== "bin";
        if (barX && fieldType !== "nominal" && configType === undefined) {
          advisories.push({
            code: "bar-x-discretized",
            path: `layers.${binding.index}`,
            chosen: `x treated as discrete bands (${geom} geom)`,
            howToOverride: "Use point/line/area for continuous x, or set scales.x.type explicitly.",
          });
        }
        if (barX || fieldType === "nominal") anyDiscrete = true;
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      }
      if (frame.box !== null && frame.box.outlierX.length > 0) {
        columns.push(frame.box.outlierX);
      }
      for (const v of frame.xIntercepts) {
        columns.push([v]);
        numeric.push(Float64Array.of(cellToNumber(v)));
        if (typeof v === "string" && !Number.isFinite(cellToNumber(v))) anyDiscrete = true;
        sawContinuousEvidence = true;
      }
    } else {
      if (isBarLike(geom) || geom === "density") barMeasure = true;
      if (frame.ymin !== null && frame.ymax !== null) {
        numeric.push(frame.ymin, frame.ymax);
        // Bands need not cover the center line (se: false smooths have
        // NaN bands; the summary center can escape min/max bounds).
        if ((geom === "smooth" || geom === "errorbar") && frame.yNumeric !== null) {
          numeric.push(frame.yNumeric);
        }
        if (frame.box !== null) numeric.push(frame.box.outlierY);
        typeParts.add("quantitative");
        allTemporal = false;
        sawContinuousEvidence = true;
      } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
        numeric.push(frame.yNumeric);
        typeParts.add(binding.yStatColumn);
        allTemporal = false;
        sawContinuousEvidence = true;
      } else if (binding.yField !== null) {
        // Panel-local data: free-y facets train each panel on ITS rows.
        const column = frame.table.column(binding.yField);
        columns.push(column);
        numeric.push(frame.table.numeric(binding.yField));
        const fieldType = frame.table.fieldType(binding.yField);
        typeParts.add(fieldType);
        if (fieldType === "nominal") anyDiscrete = true;
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      }
      for (const v of frame.yIntercepts) {
        columns.push([v]);
        numeric.push(Float64Array.of(cellToNumber(v)));
        sawContinuousEvidence = true;
      }
    }
  }

  return {
    columns,
    numeric,
    anyDiscrete,
    allTemporal: allTemporal && sawContinuousEvidence,
    barMeasure,
    evidence: `field type: ${[...typeParts].join("+") || "none"}`,
  };
}
