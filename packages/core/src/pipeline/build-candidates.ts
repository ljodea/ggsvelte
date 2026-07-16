/**
 * Interaction candidate store construction for a completed pipeline scene.
 * Source-backed layers use the cheap raw resolver; stat/annotation layers use
 * the identity-indexed path that reconstructs represented source rows.
 */
import { buildCandidateStore } from "../candidate-store.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";

import { createIdentityCandidateDatumResolver } from "./build-candidates-datum.js";
import {
  buildCandidateIdentityIndex,
  type CandidateIdentityIndex,
} from "./build-candidates-identity.js";
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
  const {
    scene,
    runId,
    flip,
    bindings,
    panelFrames,
    facetPanels,
    table,
    layerFields,
    color,
    fill,
    lineage,
  } = input;

  if (isAllSourceBacked(bindings)) {
    return buildSourceBackedCandidates({
      scene,
      runId,
      flip,
      bindings,
      table,
      color,
      fill,
      lineage,
    });
  }

  let identityIndex: CandidateIdentityIndex | null = null;
  const getIdentityIndex = () => {
    if (identityIndex !== null) return identityIndex;
    identityIndex = buildCandidateIdentityIndex(panelFrames, facetPanels);
    return identityIndex;
  };

  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    datum: createIdentityCandidateDatumResolver({
      scene,
      bindings,
      panelFrames,
      facetPanels,
      table,
      layerFields,
      color,
      fill,
      lineage,
      getIdentityIndex,
    }),
  });
}
