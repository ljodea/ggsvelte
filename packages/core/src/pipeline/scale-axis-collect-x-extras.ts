/**
 * Collect x evidence from boxplot outliers and annotation intercepts.
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { positionValuesToNumeric } from "./temporal-position.js";
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
    acc.numeric.push(Float64Array.of(numeric));
    const temporal =
      converted.decision.status === "temporal" ||
      (conversion.parser !== "auto" && Number.isFinite(numeric));
    if (!temporal) acc.allTemporal = false;
    if (typeof v === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
