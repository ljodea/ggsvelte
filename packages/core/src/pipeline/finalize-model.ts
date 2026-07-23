/**
 * Finalize phase: layer contracts, domains, candidates, and RenderModel.
 */
import { assembleFinalizeRenderModel } from "./finalize-model-assemble.js";
import { buildFinalizeCandidates } from "./finalize-model-candidates.js";
import { resolveFinalizeContracts } from "./finalize-model-contracts.js";
import type { FinalizeRenderModelInput } from "./finalize-model-input.js";
import type { RenderModel } from "./types.js";

export type { FinalizeRenderModelInput } from "./finalize-model-input.js";

export function finalizeRenderModel(input: FinalizeRenderModelInput): RenderModel {
  const {
    runId,
    normalized,
    options,
    flip,
    prepared,
    trained,
    panelLayout,
    scene,
    coordProjectors,
    warnings,
    advisories,
  } = input;

  const contracts = resolveFinalizeContracts({
    normalized,
    options,
    prepared,
    trained,
    scene,
    advisories,
  });

  const { lineage, candidates } = buildFinalizeCandidates({
    scene,
    runId,
    flip,
    prepared,
    trained,
    bindings: contracts.bindings,
    layerFields: contracts.layerFields,
  });

  return assembleFinalizeRenderModel({
    scene,
    trained,
    prepared,
    panelLayout,
    coordProjectors,
    flipped: flip,
    runId,
    warnings,
    advisories,
    layerBackends: contracts.layerBackends,
    layerFields: contracts.layerFields,
    layerScaledConstants: contracts.layerScaledConstants,
    baselineDomains: contracts.baselineDomains,
    effectiveDomains: contracts.effectiveDomains,
    lineage,
    candidates,
  });
}
