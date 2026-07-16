/**
 * Shared context for identity-indexed candidate resolution.
 */
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import type { CandidateIdentityIndex } from "./build-candidates-identity.js";
import type { FacetPanelDef } from "./facets.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";

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
