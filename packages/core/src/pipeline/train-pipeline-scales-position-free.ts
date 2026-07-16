/**
 * Per-panel free_x / free_y positional scale training.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import { collectAxisInputs, trainAxis } from "./scale-training.js";
import type { Advisory, LayerFrame, PipelineWarning } from "./types.js";

export function trainFreePanelScales(input: {
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  panelFrames: readonly (readonly LayerFrame[])[];
  panelCount: number;
  freeX: boolean;
  freeY: boolean;
  fixedX: PositionScale;
  fixedY: PositionScale;
  warnings: PipelineWarning[];
}): { x: PositionScale; y: PositionScale }[] {
  const { scalesConfig, panelFrames, panelCount, freeX, freeY, fixedX, fixedY, warnings } = input;

  return Array.from({ length: panelCount }, (_, p) => {
    let px = fixedX;
    let py = fixedY;
    const scratch: Advisory[] = [];
    if (freeX) {
      const inputs = collectAxisInputs("x", panelFrames[p]!, scalesConfig.x?.type, scratch);
      const training = trainAxis("x", inputs, { ...scalesConfig.x, type: fixedX.type });
      warnings.push(...training.warnings);
      px = training.scale;
    }
    if (freeY) {
      const inputs = collectAxisInputs("y", panelFrames[p]!, scalesConfig.y?.type, scratch);
      const training = trainAxis("y", inputs, { ...scalesConfig.y, type: fixedY.type });
      warnings.push(...training.warnings);
      py = training.scale;
    }
    return { x: px, y: py };
  });
}
