/**
 * Collect y-axis training evidence from a single layer frame.
 */
import { snapColumnToBins } from "./binned-scale.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import { isBarLike } from "./scale-axis-train.js";
import {
  positionColumn,
  positionFieldType,
  positionValueToScaleSpace,
  positionValuesToNumeric,
  yConversionOf,
} from "./temporal-position.js";
import type { AxisCollectAcc } from "./scale-axis-collect-x.js";
import type { LayerFrame } from "./types.js";

export function collectAxisInputsY(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  if (binding.yBinning !== undefined) {
    acc.numeric.push(Float64Array.from(binding.yBinning.edges));
  }
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
    const boundFields = [binding.yminField, binding.ymaxField].filter(
      (field): field is string => field !== null,
    );
    const evidenceFields = [
      ...new Set(
        boundFields.length > 0 ? boundFields : binding.yField === null ? [] : [binding.yField],
      ),
    ];
    if (evidenceFields.length === 0) {
      acc.typeParts.add("quantitative");
      acc.allTemporal = false;
    } else {
      for (const field of evidenceFields) {
        const fieldType = positionFieldType(frame.table, field, yConversion);
        acc.typeParts.add(fieldType);
        if (fieldType === "nominal") acc.anyDiscrete = true;
        if (fieldType !== "temporal") acc.allTemporal = false;
      }
    }
    acc.sawContinuousEvidence = true;
  } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
    acc.numeric.push(frame.yNumeric);
    acc.typeParts.add(binding.yStatColumn);
    acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  } else if (binding.yField !== null) {
    // Panel-local data: free-y facets train each panel on ITS rows. Read in
    // scale-space so evidence matches the transformed frame arrays and trainer.
    const column = frame.table.column(binding.yField);
    acc.columns.push(column);
    acc.numeric.push(
      snapColumnToBins(
        positionColumn(frame.table, binding.yField, yConversion, binding.yTransform),
        binding.yBinning,
      ),
    );
    const fieldType = positionFieldType(frame.table, binding.yField, yConversion);
    acc.typeParts.add(fieldType);
    if (fieldType === "nominal") acc.anyDiscrete = true;
    if (fieldType !== "temporal") acc.allTemporal = false;
    acc.sawContinuousEvidence = true;
  }
  for (const v of frame.yIntercepts) {
    acc.columns.push([v]);
    const converted = positionValuesToNumeric([v], yConversion);
    const numeric = converted.values[0] ?? Number.NaN;
    const temporal =
      converted.decision.status === "temporal" ||
      (yConversion.parser !== "auto" && Number.isFinite(numeric));
    if (temporal) {
      assertInferredTemporalTransform(
        "y",
        binding.yTransform === undefined
          ? undefined
          : { transform: binding.yTransform.transform.key },
        true,
      );
    }
    acc.numeric.push(
      Float64Array.of(positionValueToScaleSpace(v, yConversion, binding.yTransform)),
    );
    if (!temporal) acc.allTemporal = false;
    if (typeof v === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
