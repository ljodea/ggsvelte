/**
 * Finalize phase: two-pass layout, geometry batches, and scene assembly.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { buildPanelCoordProjector, type PanelCoordProjector } from "../coord-projector.js";
import type { Scene } from "../scene.js";
import type { ThemeTokens } from "../theme.js";

import { finalizeGeometryAndScene } from "./finalize-geometry-scene.js";
import { finalizePanelLayoutPass } from "./finalize-layout-pass.js";
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
}): {
  panelLayout: PanelLayoutResult;
  scene: Scene;
  coordProjectors: readonly PanelCoordProjector[];
} {
  const panelLayout = finalizePanelLayoutPass(input);
  const coord = input.normalized.coord?.type === "transform" ? input.normalized.coord : undefined;
  const coordProjectors = input.trained.panelScales.map((scales) =>
    buildPanelCoordProjector(scales, coord),
  );
  const scene = finalizeGeometryAndScene({ ...input, panelLayout, coordProjectors });
  return { panelLayout, scene, coordProjectors };
}
