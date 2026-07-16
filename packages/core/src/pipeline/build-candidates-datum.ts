/**
 * Stat/annotation candidate datum resolver: reconstructs series, ranks, and
 * represented source-row lineages from layer frames + identity index.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import {
  resolveIdentityCandidateDatum,
  type IdentityCandidateResolveContext,
} from "./build-candidates-datum-resolve.js";
import type { CandidateIdentityIndex } from "./build-candidates-identity.js";
import type { FacetPanelDef } from "./facets.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";

export function createIdentityCandidateDatumResolver(input: {
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
}): (facts: CandidateBuildFacts) => CandidateDatum {
  const ctx: IdentityCandidateResolveContext = input;
  return (facts) => resolveIdentityCandidateDatum(ctx, facts);
}
