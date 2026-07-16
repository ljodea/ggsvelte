/**
 * trainPipelineScales input contract.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { EditionDefaults } from "../editions.js";
import type { ColumnTable } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface TrainPipelineScalesInput {
  normalized: PortableSpec;
  options: RunOptions;
  table: ColumnTable;
  /** Unfiltered bound table; color/fill scales train on its value catalog. */
  sourceTable: ColumnTable;
  bindings: readonly LayerBinding[];
  facetPanels: readonly FacetPanelDef[];
  panelFrames: readonly (readonly LayerFrame[])[];
  freeX: boolean;
  freeY: boolean;
  editionDefaults: EditionDefaults;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}
