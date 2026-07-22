/**
 * Shared context shapes for identity candidate datum resolution.
 * Implementation modules: datum-locate, datum-series, datum (factory).
 */
import type { LineageStore } from "../../identity.js";
import type { CellValue, ColumnTable } from "../../table.js";
import type { FacetPanelDef } from "../facets.js";
import type { LayerBinding, LayerFrame, MappedField, ResolvedColorScale } from "../types.js";
import type { Scene } from "../../scene.js";
import type { CandidateIdentityIndex } from "./identity-index.js";

export interface IdentityCandidateResolveContext {
  scene: Scene;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly LayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  layerFields: readonly MappedField[][];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
  getIdentityIndex: () => CandidateIdentityIndex;
}

/** Intermediate locate result before series/logical/lineage assembly. */
export interface LocatedIdentityCandidate {
  sourceRow: number | null;
  frame: LayerFrame | undefined;
  outlierSourceRow: number | null;
  frameRow: number;
  derivedGroup: number;
  sourceValue: (field: string | undefined) => CellValue;
  xField: string | undefined;
  yField: string | undefined;
  colorField: string | undefined;
  fillField: string | undefined;
  seriesByRow: Map<string, number>;
  sourceRowsByGroup: Map<string, number[]>;
  sourceRowsByGroupX: Map<string, number[]>;
  sourceRowsByGroupBin: Map<string, number[]>;
  sourceRowsByGroupY: Map<string, number[]>;
}
