/** Collect y-axis evidence from segment ends and annotation intercepts. */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import {
  positionFieldType,
  positionValueToScaleSpace,
  positionValuesToNumeric,
  yConversionOf,
} from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectYEndEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.yend === null || frame.yend === undefined) return;
  acc.numeric.push(frame.yend);
  if (frame.yendValues !== null && frame.yendValues !== undefined) {
    acc.columns.push(frame.yendValues);
  }
  const endField = frame.binding.yendField;
  if (endField !== null && frame.table.has(endField)) {
    const endType = positionFieldType(frame.table, endField, yConversionOf(frame.binding));
    acc.typeParts.add(endType);
    if (endType === "nominal") acc.anyDiscrete = true;
    if (endType !== "temporal") acc.allTemporal = false;
  } else {
    acc.typeParts.add("quantitative");
    acc.allTemporal = false;
  }
  acc.sawContinuousEvidence = true;
}

export function collectYIntercepts(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  const conversion = yConversionOf(binding);
  for (const value of frame.yIntercepts) {
    acc.columns.push([value]);
    const converted = positionValuesToNumeric([value], conversion);
    const numeric = converted.values[0] ?? Number.NaN;
    const temporal =
      converted.decision.status === "temporal" ||
      (conversion.parser !== "auto" && Number.isFinite(numeric));
    if (temporal && !(conversion.forcedNonTemporal && Number.isFinite(numeric))) {
      assertInferredTemporalTransform(
        "y",
        binding.yTransform === undefined
          ? undefined
          : { transform: binding.yTransform.transform.key },
        true,
      );
    }
    acc.numeric.push(
      Float64Array.of(positionValueToScaleSpace(value, conversion, binding.yTransform)),
    );
    if (!temporal) acc.allTemporal = false;
    if (typeof value === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
