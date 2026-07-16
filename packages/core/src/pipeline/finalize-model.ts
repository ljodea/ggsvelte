/**
 * Finalize phase: layer contracts, domains, candidates, and RenderModel.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";

import { assembleRenderModel } from "./assemble-render-model.js";
import { buildPipelineCandidates } from "./build-candidates.js";
import { computeBaselineDomains, computeEffectiveDomains } from "./compute-domains.js";
import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "./layer-contracts.js";
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
  const { freeX, freeY, facetPanels, bindings, panelFrames, table } = prepared;
  const { xTraining, yTraining, panelScales, colorResolution, fillResolution, xInputs, yInputs } =
    trained;

  const layerBackends = resolveLayerBackends(
    normalized.layers,
    scene.batches,
    normalized.a11y,
    options.canvasThreshold,
    advisories,
  );
  const layerFields = resolveLayerFields(normalized.layers.length, bindings);
  const layerScaledConstants = resolveLayerScaledConstants(normalized.layers.length, bindings);

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

  const lineage = new LineageStore<number>();
  const candidates = buildPipelineCandidates({
    scene,
    runId,
    flip,
    bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields,
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
    layerBackends,
    layerFields,
    layerScaledConstants,
    baselineDomains,
    effectiveDomains,
    lineage,
    candidates,
    formatX: panelLayout.formatX,
    formatY: panelLayout.formatY,
    table,
  });
}
