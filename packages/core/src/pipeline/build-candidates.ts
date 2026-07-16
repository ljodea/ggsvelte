/**
 * Interaction candidate store construction for a completed pipeline scene.
 * Source-backed layers use the cheap raw resolver; stat/annotation layers use
 * the identity-indexed path that reconstructs represented source rows.
 */
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import { buildIdentityIndexedCandidates } from "./build-candidates-identity-store.js";
import {
  buildSourceBackedCandidates,
  isAllSourceBacked,
} from "./build-candidates-source-backed.js";
import type { FacetPanelDef } from "./facets.js";
import type { MappedField } from "./types.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";

export function buildPipelineCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly LayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  layerFields: readonly MappedField[][];
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  if (isAllSourceBacked(input.bindings)) {
    return buildSourceBackedCandidates(input);
  }
  return buildIdentityIndexedCandidates(input);
}
