/**
 * Train fixed/free positional scales and global color/fill scales for a run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { PositionScale } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import { collectAxisInputs, resolveColorScale, trainAxis } from "./scale-training.js";
import type { Advisory, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

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

export function trainPipelineScales(input: {
  normalized: PortableSpec;
  options: RunOptions;
  table: ColumnTable;
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  freeX: boolean;
  freeY: boolean;
  editionDefaults: EditionDefaults;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): TrainedPipelineScales {
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

  const labs = normalized.labs ?? {};
  const firstColorField = allFrames.find((f) => f.binding.color.field !== null)?.binding.color
    .field;
  const firstFillField = allFrames.find((f) => f.binding.fill.field !== null)?.binding.fill.field;
  const colorResolution = resolveColorScale(
    "color",
    allFrames,
    table,
    scalesConfig.color,
    options.prevScales?.["color"] ?? null,
    labs.color ?? firstColorField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );
  const fillResolution = resolveColorScale(
    "fill",
    allFrames,
    table,
    scalesConfig.fill,
    options.prevScales?.["fill"] ?? null,
    labs.fill ?? firstFillField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );

  return {
    xTraining,
    yTraining,
    panelScales,
    colorResolution,
    fillResolution,
    xInputs,
    yInputs,
    scalesConfig,
    allFrames,
  };
}
