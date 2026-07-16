/**
 * Finalize phase: two-pass layout, geometry batches, and scene assembly.
 */
import type { PortableSpec } from "@ggsvelte/spec";

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
}): { panelLayout: PanelLayoutResult; scene: Scene } {
  const panelLayout = finalizePanelLayoutPass(input);
  const scene = finalizeGeometryAndScene({ ...input, panelLayout });
  return { panelLayout, scene };
}
