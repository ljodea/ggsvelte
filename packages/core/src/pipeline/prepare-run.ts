import type { PortableSpec, SpecInput } from "@ggsvelte/spec";

import {
  needsUncensoredBaselinePass,
  trainUncensoredBaselineDomains,
} from "./baseline-uncensored.js";
import type { PipelineRunState } from "./finalize.js";
import { preparePanels } from "./prepare-panels.js";
import { allocatePipelineRunId } from "./run-id.js";
import { setupPipelineRun } from "./setup-run.js";
import { trainPipelineScales } from "./train-pipeline-scales.js";
import type { Advisory, PipelineWarning, RunOptions } from "./types.js";
import { perfMark, perfMeasure } from "../perf.js";

/** Setup, bind, and train the shared run state consumed by either finalizer. */
export function preparePipelineRun(
  spec: SpecInput | PortableSpec,
  options: RunOptions,
): PipelineRunState {
  const runId = allocatePipelineRunId();
  const warnings: PipelineWarning[] = [];
  const advisories: Advisory[] = [];

  const { normalized, editionDefaults, theme, flip } = setupPipelineRun(
    spec,
    options.editions,
    warnings,
  );

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

  perfMark("ggsvelte:bind:start");
  const prepared = preparePanels(normalized, runOptions, warnings, advisories);
  perfMark("ggsvelte:bind:end");
  perfMeasure("ggsvelte:bind", "ggsvelte:bind:start", "ggsvelte:bind:end");

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

  return {
    runId,
    normalized,
    options: runOptions,
    theme,
    flip,
    prepared,
    trained,
    warnings,
    advisories,
  };
}
