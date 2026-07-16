/**
 * Shared accumulator for axis evidence collection.
 */
import type { CellValue } from "../table.js";

export interface AxisCollectAcc {
  columns: (readonly CellValue[])[];
  numeric: Float64Array[];
  anyDiscrete: boolean;
  allTemporal: boolean;
  sawContinuousEvidence: boolean;
  barMeasure: boolean;
  typeParts: Set<string>;
}
