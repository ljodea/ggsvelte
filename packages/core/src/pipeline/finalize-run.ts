/**
 * Final pipeline phases: layout, geometry, scene assembly, contracts,
 * domains, candidates, and RenderModel construction.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { LineageStore } from "../identity.js";
import type { ThemeTokens } from "../theme.js";
import { perfMark, perfMeasure } from "../perf.js";

import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./types.js";
import { computePanelLayout } from "./panel-layout.js";
import { assembleScene, buildGeometryBatches } from "./assemble-scene.js";
import {
  resolveLayerBackends,
  resolveLayerFields,
  resolveLayerScaledConstants,
} from "./layer-contracts.js";
import { buildPipelineCandidates } from "./build-candidates.js";
import { computeBaselineDomains, computeEffectiveDomains } from "./compute-domains.js";
import { assembleRenderModel } from "./assemble-render-model.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";

export function finalizePipelineRun(input: {
  runId: number;
  normalized: PortableSpec;
  options: RunOptions;
  theme: ThemeTokens;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): RenderModel {
  const { runId, normalized, options, theme, flip, prepared, trained, warnings, advisories } =
    input;
  const { faceted, freeX, freeY, nrow, ncol, facetPanels, bindings, panelFrames, table } = prepared;
  const {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
    xInputs,
    yInputs,
    scalesConfig,
    allFrames,
  } = trained;

  // layout (bounded two-pass; facet grids run the per-panel mirror of it)
  perfMark("ggsvelte:layout:start");
  const panelLayout = computePanelLayout({
    flip,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    facetPanels,
    panelScales,
    allFrames,
    labs: normalized.labs ?? {},
    scalesConfig,
    xScale: xTraining.scale,
    yScale: yTraining.scale,
    colorLegend: colorResolution.legendInput,
    fillLegend: fillResolution.legendInput,
    legendOrder: normalized.legend?.order ?? "stable-domain",
    theme,
    options,
    warnings,
  });
  perfMark("ggsvelte:layout:end");
  perfMeasure("ggsvelte:layout", "ggsvelte:layout:start", "ggsvelte:layout:end");

  // geometry (panel-local px; coord flip transforms per batch).
  // LAYER-major order: layer order is paint order across the whole plot, and
  // it keeps each layer's batches contiguous so strata planning (contiguous
  // same-backend batches share a stratum) never fragments on facet panels.
  perfMark("ggsvelte:geometry:start");
  const batches = buildGeometryBatches({
    layerCount: normalized.layers.length,
    facetPanels,
    panelFrames,
    placements: panelLayout.placements,
    panelScales,
    color: colorResolution.resolved,
    fill: fillResolution.resolved,
    flip,
    warnings,
  });
  perfMark("ggsvelte:geometry:end");
  perfMeasure("ggsvelte:geometry", "ggsvelte:geometry:start", "ggsvelte:geometry:end");

  const scene = assembleScene({
    width: options.width,
    height: options.height,
    placements: panelLayout.placements,
    facetPanels,
    displayScales: panelLayout.displayScales,
    hTitle: panelLayout.hTitle,
    vTitle: panelLayout.vTitle,
    batches,
    legendBlock: panelLayout.legendBlock,
    topBand: panelLayout.topBand,
    theme,
    title: panelLayout.title,
    subtitle: panelLayout.subtitle,
    caption: panelLayout.caption,
  });

  const layerBackends = resolveLayerBackends(
    normalized.layers,
    batches,
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
