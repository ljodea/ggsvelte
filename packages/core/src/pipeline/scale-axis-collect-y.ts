/**
 * Collect y-axis training evidence from a single layer frame.
 */
import { isBarLike } from "./scale-axis-train.js";
import { positionValueToNumber, yConversionOf } from "./temporal-position.js";
import type { AxisCollectAcc } from "./scale-axis-collect-x.js";
import type { LayerFrame } from "./types.js";

export function collectAxisInputsY(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  const geom = binding.layer.geom;
  const yConversion = yConversionOf(binding);

  if (isBarLike(geom) || geom === "density") acc.barMeasure = true;
  if (frame.ymin !== null && frame.ymax !== null) {
    acc.numeric.push(frame.ymin, frame.ymax);
    // Bands need not cover the center line (se: false smooths have
    // NaN bands; the summary center can escape min/max bounds).
    if ((geom === "smooth" || geom === "errorbar") && frame.yNumeric !== null) {
      acc.numeric.push(frame.yNumeric);
    }
    if (frame.box !== null) acc.numeric.push(frame.box.outlierY);
    acc.typeParts.add("quantitative");
    acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
    acc.numeric.push(frame.yNumeric);
    acc.typeParts.add(binding.yStatColumn);
    acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (binding.yField !== null) {
    // Panel-local data: free-y facets train each panel on ITS rows.
    const column = frame.table.column(binding.yField);
    acc.columns.push(column);
    acc.numeric.push(
      frame.table.numeric(binding.yField, yConversion.sourceParser, yConversion.options),
    );
    const fieldType = frame.table.fieldType(
      binding.yField,
      yConversion.sourceParser,
      yConversion.options,
    );
    acc.typeParts.add(fieldType);
    if (fieldType === "nominal") acc.anyDiscrete = true;
    if (fieldType !== "temporal") acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  }
  for (const v of frame.yIntercepts) {
    acc.columns.push([v]);
    acc.numeric.push(Float64Array.of(positionValueToNumber(v, yConversion)));
    acc.sawContinuousEvidence = true;
  }
}
