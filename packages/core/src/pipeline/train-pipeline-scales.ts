/**
 * Train fixed/free positional scales and global color/fill scales for a run.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import { trainPipelineColorScales } from "./train-pipeline-scales-color.js";
import { trainPipelinePositionScales } from "./train-pipeline-scales-position.js";
import type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";
import type { Advisory, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export type { TrainedPipelineScales } from "./train-pipeline-scales-types.js";

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
