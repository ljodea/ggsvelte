/**
 * Collect x evidence from mapped xValues/xNumeric (including bar discretization).
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { positionFieldType, xConversionOf } from "./temporal-position.js";
import type { Advisory, LayerFrame } from "./types.js";

export function collectMappedXEvidence(
  frame: LayerFrame,
  configType: PositionScaleSpec["type"] | undefined,
  advisories: Advisory[],
  acc: AxisCollectAcc,
): void {
  if (frame.xValues === null && frame.xNumeric === null) return;
  if (frame.xValues !== null) acc.columns.push(frame.xValues);
  if (frame.xNumeric !== null) acc.numeric.push(frame.xNumeric);
  const { binding } = frame;
  const geom = binding.layer.geom;
  const field = binding.xField!;
  const conversion = xConversionOf(binding);
  const fieldType = frame.table.has(field)
    ? positionFieldType(frame.table, field, conversion)
    : "quantitative";
  acc.typeParts.add(fieldType);
  const barX = (geom === "bar" || geom === "col") && binding.layer.stat !== "bin";
  if (barX && fieldType !== "nominal" && configType === undefined) {
    advisories.push({
      code: "bar-x-discretized",
      path: `layers.${binding.index}`,
      chosen: `x treated as discrete bands (${geom} geom)`,
      howToOverride: "Use point/line/area for continuous x, or set scales.x.type explicitly.",
    });
  }
  if (barX || fieldType === "nominal") acc.anyDiscrete = true;
  if (fieldType !== "temporal") acc.allTemporal = false;
  acc.sawContinuousEvidence = true;
}
