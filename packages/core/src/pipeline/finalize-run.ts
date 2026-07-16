/**
 * Final pipeline phases: layout, geometry, scene assembly, contracts,
 * domains, candidates, and RenderModel construction.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ThemeTokens } from "../theme.js";

import { finalizeLayoutAndGeometry } from "./finalize-layout-geometry.js";
import { finalizeRenderModel } from "./finalize-model.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { Advisory, PipelineWarning, RenderModel, RunOptions } from "./types.js";

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

  const { panelLayout, scene } = finalizeLayoutAndGeometry({
    normalized,
    options,
    theme,
    flip,
    prepared,
    trained,
    warnings,
  });

  return finalizeRenderModel({
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
  });
}
