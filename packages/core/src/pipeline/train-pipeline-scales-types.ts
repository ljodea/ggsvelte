/**
 * Trained scale bundle for one pipeline run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import { collectAxisInputs, resolveColorScale, trainAxis } from "./scale-training.js";
import type { StyleResolution } from "./scale-style-types.js";
import type { LayerFrame } from "./types.js";
import type { StyleAesthetic } from "@ggsvelte/spec";

export interface TrainedPipelineScales {
  xTraining: ReturnType<typeof trainAxis>;
  yTraining: ReturnType<typeof trainAxis>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorResolution: ReturnType<typeof resolveColorScale>;
  fillResolution: ReturnType<typeof resolveColorScale>;
  styleResolutions: Record<StyleAesthetic, StyleResolution>;
  xInputs: ReturnType<typeof collectAxisInputs>;
  yInputs: ReturnType<typeof collectAxisInputs>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  allFrames: LayerFrame[];
}
