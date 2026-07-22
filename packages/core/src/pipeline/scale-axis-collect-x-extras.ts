/**
 * Collect x evidence from boxplot outliers and annotation intercepts.
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import { positionValueToScaleSpace, positionValuesToNumeric } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectXOutliersAndIntercepts(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.box !== null && frame.box.outlierX.length > 0) {
    acc.columns.push(frame.box.outlierX);
  }
  for (const v of frame.xIntercepts) {
    acc.columns.push([v]);
    const conversion = frame.binding.xConversion;
    const converted = positionValuesToNumeric([v], conversion);
    const numeric = converted.values[0] ?? Number.NaN;
    const temporal =
      converted.decision.status === "temporal" ||
      (conversion.parser !== "auto" && Number.isFinite(numeric));
    // Annotation-only axes never enter mapped-field temporal.decisions, so
    // reject temporal intercepts under a non-identity transform here — but
    // forced-linear axes may coerce year-like strings ("2024") quantitatively
    // only when the value is finite.
    if (temporal && !(conversion.forcedNonTemporal && Number.isFinite(numeric))) {
      assertInferredTemporalTransform(
        "x",
        frame.binding.xTransform === undefined
          ? undefined
          : { transform: frame.binding.xTransform.transform.key },
        true,
      );
    }
    acc.numeric.push(
      Float64Array.of(positionValueToScaleSpace(v, conversion, frame.binding.xTransform)),
    );
    if (!temporal) acc.allTemporal = false;
    if (typeof v === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
