/**
 * Collect continuous x evidence from xmin/xmax edges (stat-bin bars or geom rect/tile/raster).
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { positionFieldType, xConversionOf } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectBinnedXEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.xmin === null || frame.xmax === null) return;
  acc.numeric.push(frame.xmin, frame.xmax);
  const xConversion = xConversionOf(frame.binding);
  const evidenceFields = [
    ...new Set(
      [frame.binding.xminField, frame.binding.xmaxField, frame.binding.xField].filter(
        (field): field is string => field !== null,
      ),
    ),
  ];
  if (evidenceFields.length === 0) {
    acc.typeParts.add("quantitative");
    acc.allTemporal = false;
  } else {
    for (const field of evidenceFields) {
      const fieldType = frame.table.has(field)
        ? positionFieldType(frame.table, field, xConversion)
        : "quantitative";
      // Stat-bin paths keep the historical "binned …" type label; edge geoms use the raw type.
      const geom = frame.binding.layer.geom;
      const label =
        geom === "rect" || geom === "tile" || geom === "raster" ? fieldType : `binned ${fieldType}`;
      acc.typeParts.add(label);
      if (fieldType === "nominal") acc.anyDiscrete = true;
      if (fieldType !== "temporal") acc.allTemporal = false;
    }
  }
  acc.sawContinuousEvidence = true;
}
