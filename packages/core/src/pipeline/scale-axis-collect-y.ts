/**
 * Collect y-axis training evidence from a single layer frame.
 */
import type { AxisCollectAcc } from "./scale-axis-collect-acc.js";
import { collectBinnedYEvidence, collectViolinYEvidence } from "./scale-axis-collect-y-binned.js";
import { collectMappedYEvidence, collectStatYEvidence } from "./scale-axis-collect-y-mapped.js";
import { collectYEndEvidence, collectYIntercepts } from "./scale-axis-collect-y-extras.js";
import { isBarLike } from "./scale-axis-train.js";
import type { LayerFrame } from "./types.js";

export function collectAxisInputsY(frame: LayerFrame, acc: AxisCollectAcc): void {
  const { binding } = frame;
  if (binding.yBinning !== undefined) {
    acc.numeric.push(Float64Array.from(binding.yBinning.edges));
  }
  const geom = binding.layer.geom;
  if (isBarLike(geom) || geom === "density" || geom === "dotplot") acc.barMeasure = true;

  if (geom === "violin") {
    collectViolinYEvidence(frame, acc);
    return;
  }
  if (frame.ymin !== null && frame.ymax !== null) {
    collectBinnedYEvidence(frame, acc);
  } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
    collectStatYEvidence(frame, acc);
  } else if (binding.yField !== null) {
    collectMappedYEvidence(frame, acc);
  } else if (frame.yNumeric !== null) {
    collectStatYEvidence(frame, acc);
  }
  collectYEndEvidence(frame, acc);
  collectYIntercepts(frame, acc);
}
