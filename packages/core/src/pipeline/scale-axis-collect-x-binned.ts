/**
 * Collect continuous x evidence from binned xmin/xmax edges.
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { xConversionOf } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectBinnedXEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.xmin === null || frame.xmax === null) return;
  acc.numeric.push(frame.xmin, frame.xmax);
  const field = frame.binding.xField!;
  const xConversion = xConversionOf(frame.binding);
  const fieldType = frame.table.has(field)
    ? frame.table.fieldType(field, xConversion.sourceParser, xConversion.options)
    : "quantitative";
  acc.typeParts.add(`binned ${fieldType}`);
  if (fieldType !== "temporal") acc.allTemporal = false;
  acc.sawContinuousEvidence = true;
}
