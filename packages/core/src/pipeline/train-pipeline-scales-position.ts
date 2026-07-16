/**
 * Train fixed and free positional scales for a pipeline run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import type { FacetPanelDef } from "./facets.js";
import { collectAxisInputs, trainAxis } from "./scale-training.js";
import type { Advisory, LayerFrame, PipelineWarning } from "./types.js";

export interface TrainedPositionScales {
  xTraining: ReturnType<typeof trainAxis>;
  yTraining: ReturnType<typeof trainAxis>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  xInputs: ReturnType<typeof collectAxisInputs>;
  yInputs: ReturnType<typeof collectAxisInputs>;
  allFrames: LayerFrame[];
}

export function trainPipelinePositionScales(input: {
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  freeX: boolean;
  freeY: boolean;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): TrainedPositionScales {
  const { scalesConfig, facetPanels, panelFrames, freeX, freeY, warnings, advisories } = input;

  const allFrames = panelFrames.flat();
  const xInputs = collectAxisInputs("x", allFrames, scalesConfig.x?.type, advisories);
  const yInputs = collectAxisInputs("y", allFrames, scalesConfig.y?.type, advisories);
  const xTraining = trainAxis("x", xInputs, scalesConfig.x);
  const yTraining = trainAxis("y", yInputs, scalesConfig.y);
  advisories.push(...xTraining.advisories, ...yTraining.advisories);
  warnings.push(...xTraining.warnings, ...yTraining.warnings);

  const panelScales: { x: PositionScale; y: PositionScale }[] = facetPanels.map((_, p) => {
    let px = xTraining.scale;
    let py = yTraining.scale;
    const scratch: Advisory[] = [];
    if (freeX) {
      const inputs = collectAxisInputs("x", panelFrames[p]!, scalesConfig.x?.type, scratch);
      const training = trainAxis("x", inputs, { ...scalesConfig.x, type: xTraining.scale.type });
      warnings.push(...training.warnings);
      px = training.scale;
    }
    if (freeY) {
      const inputs = collectAxisInputs("y", panelFrames[p]!, scalesConfig.y?.type, scratch);
      const training = trainAxis("y", inputs, { ...scalesConfig.y, type: yTraining.scale.type });
      warnings.push(...training.warnings);
      py = training.scale;
    }
    return { x: px, y: py };
  });

  return { xTraining, yTraining, panelScales, xInputs, yInputs, allFrames };
}
