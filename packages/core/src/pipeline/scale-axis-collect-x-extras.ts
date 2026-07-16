/**
 * Collect x evidence from boxplot outliers and annotation intercepts.
 */
import { cellToNumber } from "../table.js";

import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import type { LayerFrame } from "./types.js";

export function collectXOutliersAndIntercepts(frame: LayerFrame, acc: AxisCollectAcc): void {
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
