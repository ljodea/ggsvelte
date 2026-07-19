/**
 * CandidateStore construction for a completed pipeline scene.
 *
 * This is the sole outer seam. Source-backed and identity-indexed strategies,
 * including their lazy lineage and datum resolution, remain implementation
 * details of this module.
 */
import { buildCandidateStore } from "../candidate-store.js";
import type { CandidateBuildFacts, CandidateDatum, CandidateStore } from "../candidate-store.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { CellValue, ColumnTable } from "../table.js";
import {
  createIdentityCandidateDatumResolver,
  ordinalColorRank,
} from "./candidate-construction/datum.js";
import { createLazyIdentityIndex } from "./candidate-construction/identity-index.js";
import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode } from "./frame-candidates-auto-mode.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import type { LayerBinding, LayerFrame, MappedField, ResolvedColorScale } from "./types.js";

function createRawCandidateDatumResolver(
  bindings: readonly LayerBinding[],
  table: ColumnTable,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  lineage: LineageStore<number>,
): (facts: CandidateBuildFacts) => CandidateDatum {
  const groupsByLayer = new Map<number, readonly number[]>();
  const groupsFor = (layerIndex: number): readonly number[] => {
    let groups = groupsByLayer.get(layerIndex);
    if (groups === undefined) {
      const binding = bindings[layerIndex];
      groups = binding === undefined ? [] : deriveLayerGroups(binding, table);
      groupsByLayer.set(layerIndex, groups);
    }
    return groups;
  };
  return (facts) => {
    const binding = bindings[facts.layerIndex];
    const sourceRow = facts.rowIndex;
    if (binding === undefined || sourceRow === null) return {};
    const value = (field: string | null): CellValue =>
      field === null ? null : table.column(field)[sourceRow]!;
    const group = groupsFor(facts.layerIndex)[sourceRow] ?? 0;
    const colorRank = ordinalColorRank(color, binding.color.field, () =>
      value(binding.color.field),
    );
    const fillRank = ordinalColorRank(fill, binding.fill.field, () => value(binding.fill.field));
    return {
      xValue: value(binding.xField),
      yValue: value(binding.yField),
      seriesId: group,
      seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
      sourceOrder: sourceRow,
      lineage: lineage.intern([sourceRow]),
      autoMode: candidateAutoMode(binding, facts.primitiveIndex),
    };
  };
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

function buildSourceBackedCandidates(input: {
  scene: Scene;
  runId: number;
  flip: boolean;
  bindings: readonly LayerBinding[];
  table: ColumnTable;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  const { scene, runId, flip, bindings, table, color, fill, lineage } = input;
  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    datum: createRawCandidateDatumResolver(bindings, table, color, fill, lineage),
  });
}

function buildIdentityIndexedCandidates(input: {
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

  const getIdentityIndex = createLazyIdentityIndex(panelFrames, facetPanels);

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

// ---------------------------------------------------------------------------
// Candidate construction interface
// ---------------------------------------------------------------------------
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
