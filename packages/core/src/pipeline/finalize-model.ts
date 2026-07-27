/**
 * Finalize phase: layer contracts, domains, candidates, and RenderModel.
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { PanelCoordProjector } from "../coord-projector.js";
import type { Scene } from "../scene.js";

import { assembleFinalizeRenderModel } from "./finalize-model-assemble.js";
import { buildFinalizeCandidates } from "./finalize-model-candidates.js";
import { resolveFinalizeContracts } from "./finalize-model-contracts.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./types.js";

export interface FinalizeRenderModelInput {
  runId: number;
  normalized: PortableSpec;
  options: RunOptions;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  panelLayout: PanelLayoutResult;
  scene: Scene;
  coordProjectors: readonly PanelCoordProjector[];
  warnings: PipelineWarning[];
  advisories: Advisory[];
}

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
