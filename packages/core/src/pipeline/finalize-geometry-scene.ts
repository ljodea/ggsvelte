/**
 * Finalize phase: geometry batches and scene assembly after layout.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { PanelCoordProjector } from "../coord-projector.js";
import { perfMark, perfMeasure } from "../perf.js";
import type { Scene } from "../scene.js";
import type { ThemeTokens } from "../theme.js";

import { assembleScene, buildGeometryBatches } from "./assemble-scene.js";
import { resolveAxisGuide } from "./guide-config.js";
import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { PipelineWarning, RunOptions } from "./types.js";

export function finalizeGeometryAndScene(input: {
  normalized: PortableSpec;
  options: RunOptions;
  theme: ThemeTokens;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  panelLayout: PanelLayoutResult;
  coordProjectors: readonly PanelCoordProjector[];
  warnings: PipelineWarning[];
}): Scene {
  const {
    normalized,
    options,
    theme,
    flip,
    prepared,
    trained,
    panelLayout,
    coordProjectors,
    warnings,
  } = input;
  const { facetPanels, panelFrames } = prepared;
  const { panelScales, colorResolution, fillResolution, styleResolutions } = trained;

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
    styles: Object.fromEntries(
      Object.entries(styleResolutions).map(([aesthetic, resolution]) => [
        aesthetic,
        resolution.resolved,
      ]),
    ) as import("./geometry-style.js").ResolvedStyleScales,
    flip,
    coordProjectors,
    warnings,
  });
  perfMark("ggsvelte:geometry:end");
  perfMeasure("ggsvelte:geometry", "ggsvelte:geometry:start", "ggsvelte:geometry:end");

  const xGuide = resolveAxisGuide("x", trained.scalesConfig, normalized.guides);
  const yGuide = resolveAxisGuide("y", trained.scalesConfig, normalized.guides);
  return assembleScene({
    width: options.width,
    height: options.height,
    placements: panelLayout.placements,
    facetPanels,
    displayScales: panelLayout.displayScales,
    hTitle: panelLayout.hTitle,
    vTitle: panelLayout.vTitle,
    hGuide: flip ? yGuide : xGuide,
    vGuide: flip ? xGuide : yGuide,
    coordProjectors,
    ...(options.measureText !== undefined && { measureText: options.measureText }),
    axisTextSize: theme.axisTextSize,
    ...((flip ? normalized.scales?.y?.minorBreaks : normalized.scales?.x?.minorBreaks) !==
      undefined && {
      hMinorBreaks: flip ? normalized.scales?.y?.minorBreaks : normalized.scales?.x?.minorBreaks,
    }),
    ...((flip ? normalized.scales?.x?.minorBreaks : normalized.scales?.y?.minorBreaks) !==
      undefined && {
      vMinorBreaks: flip ? normalized.scales?.x?.minorBreaks : normalized.scales?.y?.minorBreaks,
    }),
    batches,
    legendBlock: panelLayout.legendBlock,
    topBand: panelLayout.topBand,
    bottomBand: panelLayout.bottomBand,
    theme,
    title: panelLayout.title,
    subtitle: panelLayout.subtitle,
    caption: panelLayout.caption,
  });
}
