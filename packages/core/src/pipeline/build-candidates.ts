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

/** One hoisted style read: a column to index, or a precomputed constant. */
type StyleRead = { column: readonly CellValue[] | null; constant: CellValue };

/**
 * Per-(layer, owning table) hoisted resolution state. Column arrays and the
 * grouping array are looked up ONCE per (layer, table) instead of per mark —
 * a dense layer otherwise pays seven `table.column(field)` property walks
 * plus a `deriveLayerGroups` cache probe for every single primitive.
 */
type LayerTableState = {
  groups: readonly number[];
  x: readonly CellValue[] | null;
  y: readonly CellValue[] | null;
  size: StyleRead;
  linewidth: StyleRead;
  alpha: StyleRead;
  shape: StyleRead;
  linetype: StyleRead;
  color: readonly CellValue[] | null;
  fill: readonly CellValue[] | null;
};

function createRawCandidateDatumResolver(
  bindings: readonly LayerBinding[],
  sources: SourceRegistry,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  lineage: LineageStore<number>,
): (facts: CandidateBuildFacts) => CandidateDatum {
  // Grouping is derived per (layer, owning table) and indexed by the LOCAL row,
  // for the same reason value reads route through `sources.locate`: a layer
  // with its own DataRef (#589) has fields the plot's table does not. Deriving
  // from the plot table threw `deriveGroups: unknown field "…"` for any such
  // layer, and — where it happened not to throw — indexed a plot-length array
  // with a global row id, silently collapsing those rows into one group.
  const stateByLayer = new Map<number, WeakMap<ColumnTable, LayerTableState>>();
  // Per-layer constant-only style reads, for rows with no locatable source
  // (annotations, synthesized marks): constant styles still report their
  // constant; field-mapped styles read null.
  const constantsByLayer: (LayerTableState | undefined)[] = [];
  const buildState = (layerIndex: number, table: ColumnTable | null): LayerTableState => {
    const binding = bindings[layerIndex]!;
    const styleRead = (style: LayerBinding["size"]): StyleRead =>
      style.field === null
        ? { column: null, constant: style.scaledConstant ?? style.constant }
        : table === null
          ? { column: null, constant: null }
          : { column: table.column(style.field), constant: null };
    return {
      groups: table === null ? [] : deriveLayerGroups(binding, table),
      x: table === null || binding.xField === null ? null : table.column(binding.xField),
      y: table === null || binding.yField === null ? null : table.column(binding.yField),
      size: styleRead(binding.size),
      linewidth: styleRead(binding.linewidth),
      alpha: styleRead(binding.alpha),
      shape: styleRead(binding.shape),
      linetype: styleRead(binding.linetype),
      color:
        table === null || binding.color.field == null ? null : table.column(binding.color.field),
      fill: table === null || binding.fill.field == null ? null : table.column(binding.fill.field),
    };
  };
  // One-slot memo: marks of a layer walk rows of one table in order, so the
  // previous (layer, table) pair nearly always repeats.
  let lastLayer = -1;
  let lastTable: ColumnTable | null = null;
  let lastState: LayerTableState | null = null;
  const stateFor = (layerIndex: number, table: ColumnTable): LayerTableState => {
    if (layerIndex === lastLayer && table === lastTable && lastState !== null) return lastState;
    let byTable = stateByLayer.get(layerIndex);
    if (byTable === undefined) {
      byTable = new WeakMap<ColumnTable, LayerTableState>();
      stateByLayer.set(layerIndex, byTable);
    }
    let state = byTable.get(table);
    if (state === undefined) {
      state = buildState(layerIndex, table);
      byTable.set(table, state);
    }
    lastLayer = layerIndex;
    lastTable = table;
    lastState = state;
    return state;
  };
  // Constant-only state for rows with no locatable source (annotations,
  // synthesized marks): constant styles report their constant; field-mapped
  // styles read null; grouping is the single-group default.
  const constantsFor = (layerIndex: number): LayerTableState => {
    let state = constantsByLayer[layerIndex];
    if (state === undefined) {
      state = buildState(layerIndex, null);
      constantsByLayer[layerIndex] = state;
    }
    return state;
  };
  const colorOrdinal = color?.kind === "ordinal" || color?.kind === "manual" ? color : null;
  const fillOrdinal = fill?.kind === "ordinal" || fill?.kind === "manual" ? fill : null;
  return (facts) => {
    const binding = bindings[facts.layerIndex];
    const sourceRow = facts.rowIndex;
    if (binding === undefined || sourceRow === null) return {};
    // One locate per mark (#1308): value reads and grouping share the same
    // row ownership.
    const located = sources.locate(sourceRow);
    const state =
      located === null ? constantsFor(facts.layerIndex) : stateFor(facts.layerIndex, located.table);
    const localRow = located?.localRow ?? -1;
    const read = (column: readonly CellValue[] | null): CellValue =>
      column === null || localRow < 0 ? null : column[localRow]!;
    const readStyle = (style: StyleRead): CellValue =>
      style.column === null ? style.constant : localRow < 0 ? null : style.column[localRow]!;
    // Group 0 is the single-group default, which is what a primitive with no
    // locatable source row (annotations, synthesized marks) should carry.
    const group = localRow < 0 ? 0 : (state.groups[localRow] ?? 0);
    // Rank lookups preserve ordinalColorRank semantics exactly: non-ordinal
    // scales and unmapped fields give -1; an unlocatable row reads null.
    const colorRank =
      colorOrdinal === null || binding.color.field == null
        ? -1
        : (colorOrdinal.scale.indexOf(
            localRow < 0 || state.color === null ? null : state.color[localRow]!,
          ) ?? -1);
    const fillRank =
      fillOrdinal === null || binding.fill.field == null
        ? -1
        : (fillOrdinal.scale.indexOf(
            localRow < 0 || state.fill === null ? null : state.fill[localRow]!,
          ) ?? -1);
    const autoMode = candidateAutoMode(binding, facts.primitiveIndex);
    return {
      xValue: read(state.x),
      yValue: read(state.y),
      sizeValue: readStyle(state.size),
      linewidthValue: readStyle(state.linewidth),
      alphaValue: readStyle(state.alpha),
      shapeValue: readStyle(state.shape),
      linetypeValue: readStyle(state.linetype),
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
