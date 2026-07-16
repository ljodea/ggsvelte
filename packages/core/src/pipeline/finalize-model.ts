/**
 * Finalize phase: layer contracts, domains, candidates, and RenderModel.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";

import { assembleRenderModel } from "./assemble-render-model.js";
import { buildPipelineCandidates } from "./build-candidates.js";
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
  const { facetPanels, panelFrames, table } = prepared;
  const { xTraining, yTraining, panelScales, colorResolution, fillResolution } = trained;

  const contracts = resolveFinalizeContracts({
    normalized,
    options,
    prepared,
    trained,
    scene,
    advisories,
  });

  const lineage = new LineageStore<number>();
  const candidates = buildPipelineCandidates({
    scene,
    runId,
    flip,
    bindings: contracts.bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields: contracts.layerFields,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    lineage,
  });

  return assembleRenderModel({
    scene,
    xScale: xTraining.scale,
    yScale: yTraining.scale,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    panelScales,
    colorState: colorResolution.state,
    fillState: fillResolution.state,
    warnings,
    advisories,
    runId,
    layerBackends: contracts.layerBackends,
    layerFields: contracts.layerFields,
    layerScaledConstants: contracts.layerScaledConstants,
    baselineDomains: contracts.baselineDomains,
    effectiveDomains: contracts.effectiveDomains,
    lineage,
    candidates,
    formatX: panelLayout.formatX,
    formatY: panelLayout.formatY,
    table,
  });
}
