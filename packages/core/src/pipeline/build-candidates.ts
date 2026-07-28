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
import type { SourceRegistry } from "./source-registry.js";
import { createIdentityCandidateDatumResolver } from "./candidate-construction/datum.js";
import { ordinalColorRank } from "./candidate-construction/datum-values.js";
import { createLazyIdentityIndex } from "./candidate-construction/identity-index.js";
import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode } from "./frame-candidates-auto-mode.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import type {
  FinalizedLayerFrame,
  LayerBinding,
  MappedField,
  ResolvedColorScale,
} from "./types.js";

function createRawCandidateDatumResolver(
  bindings: readonly LayerBinding[],
  sources: SourceRegistry,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  lineage: LineageStore<number>,
): (facts: CandidateBuildFacts) => CandidateDatum {
  // Grouping is derived per (layer, owning table) and indexed by the LOCAL row,
  // for the same reason `value()` below routes through `sources.locate`: a layer
  // with its own DataRef (#589) has fields the plot's table does not. Deriving
  // from the plot table threw `deriveGroups: unknown field "…"` for any such
  // layer, and — where it happened not to throw — indexed a plot-length array
  // with a global row id, silently collapsing those rows into one group.
  const groupsByLayer = new Map<number, WeakMap<ColumnTable, readonly number[]>>();
  const groupFor = (layerIndex: number, sourceRow: number): number => {
    const binding = bindings[layerIndex];
    const located = sources.locate(sourceRow);
    // Group 0 is the single-group default, which is what a primitive with no
    // locatable source row (annotations, synthesized marks) should carry.
    if (binding === undefined || located === null) return 0;
    let byTable = groupsByLayer.get(layerIndex);
    if (byTable === undefined) {
      byTable = new WeakMap<ColumnTable, readonly number[]>();
      groupsByLayer.set(layerIndex, byTable);
    }
    let groups = byTable.get(located.table);
    if (groups === undefined) {
      groups = deriveLayerGroups(binding, located.table);
      byTable.set(located.table, groups);
    }
    return groups[located.localRow] ?? 0;
  };
  return (facts) => {
    const binding = bindings[facts.layerIndex];
    const sourceRow = facts.rowIndex;
    if (binding === undefined || sourceRow === null) return {};
    // Global row id -> the table that owns it: a layer with its own DataRef
    // has fields the plot table does not (#589).
    const value = (field: string | null): CellValue => {
      if (field === null) return null;
      const located = sources.locate(sourceRow);
      return located === null ? null : located.table.column(field)[located.localRow]!;
    };
    const styleValue = (style: LayerBinding["size"]): CellValue =>
      style.field === null ? (style.scaledConstant ?? style.constant) : value(style.field);
    const group = groupFor(facts.layerIndex, sourceRow);
    const colorRank = ordinalColorRank(color, binding.color.field, () =>
      value(binding.color.field),
    );
    const fillRank = ordinalColorRank(fill, binding.fill.field, () => value(binding.fill.field));
    const autoMode = candidateAutoMode(binding, facts.primitiveIndex);
    return {
      xValue: value(binding.xField),
      yValue: value(binding.yField),
      sizeValue: styleValue(binding.size),
      linewidthValue: styleValue(binding.linewidth),
      alphaValue: styleValue(binding.alpha),
      shapeValue: styleValue(binding.shape),
      linetypeValue: styleValue(binding.linetype),
      seriesId: group,
      seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
      sourceOrder: sourceRow,
      lineage: lineage.intern([sourceRow]),
      ...(autoMode === undefined ? {} : { autoMode }),
    };
  };
}

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
  sources: SourceRegistry;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
}): CandidateStore {
  const { scene, runId, flip, bindings, sources, color, fill, lineage } = input;
  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    uninspectableLayers: uninspectableLayers(bindings),
    datum: createRawCandidateDatumResolver(bindings, sources, color, fill, lineage),
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
