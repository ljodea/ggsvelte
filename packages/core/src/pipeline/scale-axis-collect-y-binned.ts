/** Collect y-axis evidence from violin and bound-based geoms. */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { positionFieldType, yConversionOf } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectViolinYEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.yNumeric !== null) acc.numeric.push(frame.yNumeric);
  if (frame.binding.yField === null) return;
  const fieldType = positionFieldType(
    frame.table,
    frame.binding.yField,
    yConversionOf(frame.binding),
  );
  acc.typeParts.add(fieldType);
  if (fieldType === "nominal") acc.anyDiscrete = true;
  if (fieldType !== "temporal") acc.allTemporal = false;
}

export function collectBinnedYEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.ymin === null || frame.ymax === null) return;
  acc.numeric.push(frame.ymin, frame.ymax);
  const { binding } = frame;
  const geom = binding.layer.geom;
  // Bands need not cover the center line (se: false smooths have NaN bands;
  // the summary center can escape min/max bounds).
  // pointrange/crossbar draw the center (point / mid line), so train it too.
  if (
    (geom === "smooth" || geom === "errorbar" || geom === "pointrange" || geom === "crossbar") &&
    frame.yNumeric !== null
  ) {
    acc.numeric.push(frame.yNumeric);
  }
  if (frame.box !== null) acc.numeric.push(frame.box.outlierY);
  // Tile/raster y edges are synthetic from centers — type evidence from
  // yField only so inherited ymin/ymax cannot poison inference.
  const boundFields =
    geom === "tile" || geom === "raster"
      ? []
      : [binding.yminField, binding.ymaxField].filter((field): field is string => field !== null);
  const evidenceFields = [
    ...new Set(
      boundFields.length > 0 ? boundFields : binding.yField === null ? [] : [binding.yField],
    ),
  ];
  if (evidenceFields.length === 0) {
    acc.typeParts.add("quantitative");
    acc.allTemporal = false;
  } else {
    collectBoundFieldTypes(frame, evidenceFields, acc);
  }
  acc.sawContinuousEvidence = true;
}

function collectBoundFieldTypes(
  frame: LayerFrame,
  fields: readonly string[],
  acc: AxisCollectAcc,
): void {
  const conversion = yConversionOf(frame.binding);
  for (const field of fields) {
    const fieldType = positionFieldType(frame.table, field, conversion);
    acc.typeParts.add(fieldType);
    if (fieldType === "nominal") acc.anyDiscrete = true;
    if (fieldType !== "temporal") acc.allTemporal = false;
  }
}
