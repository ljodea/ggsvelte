/**
 * Train fixed/free positional scales and global color/fill scales for a run.
 */
import { trainPipelineColorScales } from "./train-pipeline-scales-color.js";
import type { TrainPipelineScalesInput } from "./train-pipeline-scales-input.js";
import { trainPipelinePositionScales } from "./train-pipeline-scales-position.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";

export type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";
export type { TrainPipelineScalesInput } from "./train-pipeline-scales-input.js";

export function trainPipelineScales(input: TrainPipelineScalesInput): TrainedPipelineScales {
  const {
    normalized,
    options,
    table,
    facetPanels,
    panelFrames,
    freeX,
    freeY,
    editionDefaults,
    warnings,
    advisories,
  } = input;

  const scalesConfig = normalized.scales ?? {};
  const position = trainPipelinePositionScales({
    scalesConfig,
    facetPanels,
    panelFrames,
    freeX,
    freeY,
    warnings,
    advisories,
  });
  const color = trainPipelineColorScales({
    scalesConfig,
    labs: normalized.labs ?? {},
    allFrames: position.allFrames,
    table,
    options,
    editionDefaults,
    warnings,
    advisories,
  });

  return {
    ...position,
    ...color,
    scalesConfig,
  };
}
