/**
 * finalizeRenderModel input contract.
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { PanelCoordProjector } from "../coord-projector.js";
import type { Scene } from "../scene.js";

import type { PanelLayoutResult } from "./panel-layout.js";
import type { PreparedPanels } from "./prepare-panels.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales.js";
import type { Advisory, PipelineWarning, RunOptions } from "./types.js";

export interface FinalizeRenderModelInput {
  runId: number;
  normalized: PortableSpec;
  options: RunOptions;
  flip: boolean;
  prepared: PreparedPanels;
  trained: TrainedPipelineScales;
  panelLayout: PanelLayoutResult;
  scene: Scene;
  coordProjectors: readonly PanelCoordProjector[];
  warnings: PipelineWarning[];
  advisories: Advisory[];
}
