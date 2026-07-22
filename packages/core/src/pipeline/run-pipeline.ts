/**
 * Core runPipeline orchestration: setup → prepare → train → finalize.
 */
import type { SpecInput, PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";

import {
  needsUncensoredBaselinePass,
  trainUncensoredBaselineDomains,
} from "./baseline-uncensored.js";
import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./types.js";
import { allocatePipelineRunId } from "./run-id.js";
import { setupPipelineRun } from "./setup-run.js";
import { preparePanels } from "./prepare-panels.js";
import { trainPipelineScales } from "./train-pipeline-scales.js";
import { finalizePipelineRun } from "./finalize-run.js";

export function runPipeline(spec: SpecInput | PortableSpec, options: RunOptions): RenderModel {
  const runId = allocatePipelineRunId();
  perfMark("ggsvelte:pipeline:start");

  const warnings: PipelineWarning[] = [];
  const advisories: Advisory[] = [];

  const { normalized, editionDefaults, theme, flip } = setupPipelineRun(
    spec,
    options.editions,
    warnings,
  );

  // Natural baseline under domain pins: train from uncensored frames so
  // zoom-out is not starved by pre-stat pin censoring (#449). baselineDomains
  // still wins when the host already computed them (e.g. Svelte double pass).
  let runOptions = options;
  if (needsUncensoredBaselinePass(options, normalized.scales)) {
    perfMark("ggsvelte:baseline:start");
    const baselineDomains = trainUncensoredBaselineDomains({
      normalized,
      options,
      editionDefaults,
    });
    runOptions = { ...options, baselineDomains };
    perfMark("ggsvelte:baseline:end");
    perfMeasure("ggsvelte:baseline", "ggsvelte:baseline:start", "ggsvelte:baseline:end");
  }

  // bind + facet partition + per-panel frames
  perfMark("ggsvelte:bind:start");
  const prepared = preparePanels(normalized, runOptions, warnings, advisories);
  perfMark("ggsvelte:bind:end");
  perfMeasure("ggsvelte:bind", "ggsvelte:bind:start", "ggsvelte:bind:end");

  // train scales — fixed: union across panels; free: positional domains per
  // panel; discrete color/fill assignment ALWAYS global (one legend).
  perfMark("ggsvelte:scales:start");
  const trained = trainPipelineScales({
    normalized,
    options: runOptions,
    table: prepared.table,
    sourceTable: prepared.sourceTable,
    bindings: prepared.bindings,
    facetPanels: prepared.facetPanels,
    panelFrames: prepared.panelFrames,
    freeX: prepared.freeX,
    freeY: prepared.freeY,
    xConversion: prepared.xConversion,
    yConversion: prepared.yConversion,
    editionDefaults,
    warnings,
    advisories,
  });
  perfMark("ggsvelte:scales:end");
  perfMeasure("ggsvelte:scales", "ggsvelte:scales:start", "ggsvelte:scales:end");

  const model = finalizePipelineRun({
    runId,
    normalized,
    options: runOptions,
    theme,
    flip,
    prepared,
    trained,
    warnings,
    advisories,
  });

  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");
  return model;
}
