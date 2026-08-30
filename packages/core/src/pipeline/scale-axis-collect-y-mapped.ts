/** Collect y-axis evidence from mapped and synthesized values. */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { snapColumnToBins } from "./binned-scale.js";
import { positionColumn, positionFieldType, yConversionOf } from "./temporal-position.js";
import type { LayerFrame } from "./types.js";

export function collectStatYEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  if (frame.yNumeric === null) return;
  acc.numeric.push(frame.yNumeric);
  acc.typeParts.add(frame.binding.yStatColumn ?? "quantitative");
  acc.allTemporal = false;
  acc.sawContinuousEvidence = true;
}

export function collectMappedYEvidence(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  const field = binding.yField;
  if (field === null) return;
  const conversion = yConversionOf(binding);
  // Panel-local data: free-y facets train each panel on its own rows. Read in
  // scale-space so evidence matches the transformed frame arrays and trainer.
  acc.columns.push(frame.table.column(field));
  acc.numeric.push(
    snapColumnToBins(
      positionColumn(frame.table, field, conversion, binding.yTransform),
      binding.yBinning,
    ),
  );
  const fieldType = positionFieldType(frame.table, field, conversion);
  acc.typeParts.add(fieldType);
  if (fieldType === "nominal") acc.anyDiscrete = true;
  if (fieldType !== "temporal") acc.allTemporal = false;
  acc.sawContinuousEvidence = true;
}
