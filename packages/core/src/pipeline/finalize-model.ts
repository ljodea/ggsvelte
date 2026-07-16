/**
 * Finalize phase: layer contracts, domains, candidates, and RenderModel.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { Scene } from "../scene.js";

import { assembleFinalizeRenderModel } from "./finalize-model-assemble.js";
import { buildFinalizeCandidates } from "./finalize-model-candidates.js";
import { resolveFinalizeContracts } from "./finalize-model-contracts.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./types.js";

export function finalizeRenderModel(input: {
  runId: number;
  normalized: PortableSpec;
  options: RunOptions;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  panelLayout: PanelLayoutResult;
  scene: Scene;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): RenderModel {
  const {
    runId,
    normalized,
    options,
    flip,
    prepared,
    trained,
    panelLayout,
    scene,
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
