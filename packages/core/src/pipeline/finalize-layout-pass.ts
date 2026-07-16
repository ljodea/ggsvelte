/**
 * Finalize phase: two-pass panel layout only.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";
import type { ThemeTokens } from "../theme.js";

import { computePanelLayout } from "./panel-layout.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { PipelineWarning, RunOptions } from "./types.js";

export function finalizePanelLayoutPass(input: {
  normalized: PortableSpec;
  options: RunOptions;
  theme: ThemeTokens;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const { normalized, options, theme, flip, prepared, trained, warnings } = input;
  const { faceted, freeX, freeY, nrow, ncol, facetPanels } = prepared;
  const {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
    scalesConfig,
    allFrames,
  } = trained;

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
  return panelLayout;
}
