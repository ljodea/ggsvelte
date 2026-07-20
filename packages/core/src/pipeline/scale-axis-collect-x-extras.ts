/**
 * Collect x evidence from boxplot outliers and annotation intercepts.
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { positionValueToNumber } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectXOutliersAndIntercepts(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.box !== null && frame.box.outlierX.length > 0) {
    acc.columns.push(frame.box.outlierX);
  }
  for (const v of frame.xIntercepts) {
    acc.columns.push([v]);
    const numeric = positionValueToNumber(v, frame.binding.xConversion);
    acc.numeric.push(Float64Array.of(numeric));
    if (typeof v === "string" && !Number.isFinite(numeric)) acc.anyDiscrete = true;
    acc.sawContinuousEvidence = true;
  }
}
