/**
 * Effective and baseline domain snapshots for finalize.
 */
import { computeBaselineDomains, computeEffectiveDomains } from "./compute-domains.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { RunOptions, ScaleDomainSnapshot } from "./types.js";

export function resolveFinalizeDomainSnapshots(input: {
  options: RunOptions;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
}): {
  effectiveDomains: ScaleDomainSnapshot;
  baselineDomains: ScaleDomainSnapshot;
} {
  const { options, prepared, trained } = input;
  const { freeX, freeY, facetPanels, panelFrames } = prepared;
  const { xTraining, yTraining, panelScales, xInputs, yInputs } = trained;

  const effectiveDomains = computeEffectiveDomains(xTraining.scale, yTraining.scale, panelScales);
  const baselineDomains = computeBaselineDomains({
    options,
    freeX,
    freeY,
    facetPanels,
    panelFrames,
    xInputs,
    yInputs,
    effectiveDomains,
  });
  return { effectiveDomains, baselineDomains };
}
