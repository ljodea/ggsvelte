/**
 * Finalize phase: two-pass layout, geometry batches, and scene assembly.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { perfMark, perfMeasure } from "../perf.js";
import type { Scene } from "../scene.js";
import type { ThemeTokens } from "../theme.js";

import { assembleScene, buildGeometryBatches } from "./assemble-scene.js";
import { computePanelLayout } from "./panel-layout.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { PipelineWarning, RunOptions } from "./types.js";

export function finalizeLayoutAndGeometry(input: {
  normalized: PortableSpec;
  options: RunOptions;
  theme: ThemeTokens;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  warnings: PipelineWarning[];
}): { panelLayout: PanelLayoutResult; scene: Scene } {
  const { normalized, options, theme, flip, prepared, trained, warnings } = input;
  const { faceted, freeX, freeY, nrow, ncol, facetPanels, panelFrames } = prepared;
  const {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
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

  return { panelLayout, scene };
}
