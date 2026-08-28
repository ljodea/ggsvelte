/**
 * CandidateStore construction for a completed pipeline scene.
 *
 * This is the sole outer seam. Source-backed and identity-indexed strategies,
 * including their lazy lineage and datum resolution, remain implementation
 * details of this module.
 */
import { buildCandidateStore } from "../candidate-store.js";
import type { CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { ColumnTable } from "../table.js";
import { createIdentityCandidateDatumResolver } from "./candidate-construction/datum.js";
import { createLazyIdentityIndex } from "./candidate-construction/identity-index.js";
import { createRawCandidateDatumColumnsResolver } from "./candidate-source-columns.js";
import { createRawCandidateDatumResolver } from "./candidate-source-resolver.js";
import { createRawResolverState } from "./candidate-source-state.js";
import type { FacetPanelDef } from "./facets.js";
import type {
  FinalizedLayerFrame,
  LayerBinding,
  MappedField,
  ResolvedColorScale,
} from "./types.js";
import type { SourceRegistry } from "./source-registry.js";

/**
 * Layers the author marked `inspect: false` (#1065). Both candidate strategies
 * pass this through, so the opt-out holds whichever one a spec takes.
 */
function uninspectableLayers(bindings: readonly LayerBinding[]): ReadonlySet<number> {
  const opted = new Set<number>();
  for (const [index, binding] of bindings.entries()) {
    if (binding.layer.inspect === false) opted.add(index);
  }
  return opted;
}

// ---------------------------------------------------------------------------
// Source-backed strategy
// ---------------------------------------------------------------------------
function isAllSourceBacked(bindings: readonly LayerBinding[]): boolean {
  return bindings.every(
    (binding) =>
      (binding.layer.stat ?? "identity") === "identity" && binding.ruleForm !== "annotation",
  );
}

// No plot `table` here: every value and every group this strategy resolves is
// read through `sources`, which owns the per-layer tables.
function buildSourceBackedCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly FinalizedLayerFrame[])[];
  sources: SourceRegistry;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  const { scene, runId, flip, bindings, panelFrames, sources, color, fill, lineage } = input;
  const shared = createRawResolverState(bindings, color, fill);
  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    uninspectableLayers: uninspectableLayers(bindings),
    datum: createRawCandidateDatumResolver(
      bindings,
      sources,
      color,
      fill,
      lineage,
      shared,
      scene,
      panelFrames,
    ),
    datumColumns: createRawCandidateDatumColumnsResolver({
      scene,
      bindings,
      sources,
      color,
      fill,
      lineage,
      shared,
      panelFrames,
    }),
  });
}

function buildIdentityIndexedCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly FinalizedLayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  sources: SourceRegistry;
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
    sources,
    layerFields,
    color,
    fill,
    lineage,
  } = input;

  const getIdentityIndex = createLazyIdentityIndex(panelFrames, facetPanels);

  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    uninspectableLayers: uninspectableLayers(bindings),
    datum: createIdentityCandidateDatumResolver({
      scene,
      bindings,
      panelFrames,
      facetPanels,
      table,
      sources,
      layerFields,
      color,
      fill,
      lineage,
      getIdentityIndex,
    }),
  });
}

// ---------------------------------------------------------------------------
// Candidate construction interface
// ---------------------------------------------------------------------------
export function buildPipelineCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  panelFrames: readonly (readonly FinalizedLayerFrame[])[];
  facetPanels: readonly FacetPanelDef[];
  table: ColumnTable;
  sources: SourceRegistry;
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
