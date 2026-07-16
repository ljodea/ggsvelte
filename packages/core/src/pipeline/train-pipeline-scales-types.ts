/**
 * Trained scale bundle for one pipeline run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import { collectAxisInputs, resolveColorScale, trainAxis } from "./scale-training.js";
import type { LayerFrame } from "./types.js";

export interface TrainedPipelineScales {
  xTraining: ReturnType<typeof trainAxis>;
  yTraining: ReturnType<typeof trainAxis>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorResolution: ReturnType<typeof resolveColorScale>;
  fillResolution: ReturnType<typeof resolveColorScale>;
  xInputs: ReturnType<typeof collectAxisInputs>;
  yInputs: ReturnType<typeof collectAxisInputs>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  allFrames: LayerFrame[];
}
