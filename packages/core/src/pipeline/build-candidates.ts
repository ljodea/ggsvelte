/**
 * CandidateStore construction for a completed pipeline scene.
 *
 * This is the sole outer seam. Source-backed and identity-indexed strategies,
 * including their lazy lineage and datum resolution, remain implementation
 * details of this module.
 */
import { buildCandidateStore } from "../candidate-store.js";
import type {
  CandidateBatchFacts,
  CandidateBuildFacts,
  CandidateDatum,
  CandidateDatumColumns,
  CandidateStore,
  CandidateStyleColumn,
} from "../candidate-store.js";
import { defaultAutoMode } from "../candidate-geometry.js";
import { AUTO_MODE_CODE } from "../candidate-store-indexes.js";
import type { LineageStore } from "../identity.js";
import type { Scene } from "../scene.js";
import type { CellValue, ColumnTable } from "../table.js";
import type { SourceRegistry } from "./source-registry.js";
import { createIdentityCandidateDatumResolver } from "./candidate-construction/datum.js";
import { createLazyIdentityIndex } from "./candidate-construction/identity-index.js";
import type { FacetPanelDef } from "./facets.js";
import { candidateAutoMode } from "./frame-candidates-auto-mode.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import { NO_ROW } from "./types-no-row.js";
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

/**
 * Hoisted (layer, table) state shared by the per-candidate and columnar
 * resolvers so both read the same columns, constants, and rank scales.
 */
function createRawResolverState(
  bindings: readonly LayerBinding[],
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
) {
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
        table === null || binding.color.field === null ? null : table.column(binding.color.field),
      fill: table === null || binding.fill.field === null ? null : table.column(binding.fill.field),
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
  return { stateFor, constantsFor, colorOrdinal, fillOrdinal };
}

function createRawCandidateDatumResolver(
  bindings: readonly LayerBinding[],
  sources: SourceRegistry,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  lineage: LineageStore<number>,
  shared?: ReturnType<typeof createRawResolverState>,
): (facts: CandidateBuildFacts) => CandidateDatum {
  const { stateFor, constantsFor, colorOrdinal, fillOrdinal } =
    shared ?? createRawResolverState(bindings, color, fill);
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
      colorOrdinal === null || binding.color.field === null
        ? -1
        : (colorOrdinal.scale.indexOf(
            localRow < 0 || state.color === null ? null : state.color[localRow]!,
          ) ?? -1);
    const fillRank =
      fillOrdinal === null || binding.fill.field === null
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

/** All-default columns (binding missing): mirrors the `{}` per-candidate return. */
const EMPTY_DATUM_COLUMNS: CandidateDatumColumns = {
  xValue: null,
  yValue: null,
  sizeValue: null,
  linewidthValue: null,
  alphaValue: null,
  shapeValue: null,
  linetypeValue: null,
  seriesId: null,
  seriesRank: null,
  sourceOrder: null,
  lineage: null,
  autoMode: null,
};

type OrdinalRankScale = NonNullable<ReturnType<typeof createRawResolverState>>["colorOrdinal"];

/** Per-batch memo for ordinal `indexOf`: dense plots repeat values. */
function rankMemo(scale: OrdinalRankScale): ((value: CellValue) => number) | null {
  if (scale === null) return null;
  const memo = new Map<CellValue, number>();
  return (value) => {
    const prior = memo.get(value);
    if (prior !== undefined) return prior;
    const rank = scale.scale.indexOf(value) ?? -1;
    memo.set(value, rank);
    return rank;
  };
}

/** One style channel as a batch column: null-elided, constant, or a sliced source column. */
function styleColumn(
  style: StyleRead,
  slice: <T>(column: readonly T[]) => readonly T[],
): CandidateStyleColumn {
  if (style.column === null) {
    // Unmapped styles carry an undefined constant — elide to the null
    // column so the store skips the writes (callback pushes undefined,
    // which `fact()` also reads back as null).
    return style.constant === undefined || style.constant === null
      ? null
      : { kind: "constant", value: style.constant };
  }
  return { kind: "column", values: slice(style.column) };
}

/** Batch autoMode codes: whole-batch answers fill once; only `rule` varies. */
function autoModeColumn(binding: LayerBinding, facts: CandidateBatchFacts): Uint8Array | null {
  const count = facts.primitiveIds.length;
  const first = candidateAutoMode(binding, facts.semanticIds[0] ?? 0);
  // Undefined (spoke/segment → geometry default in the store) and constant
  // modes are whole-batch answers; only `rule` varies within a batch.
  if (first === undefined) return null;
  const code = AUTO_MODE_CODE[first];
  let constant = true;
  for (let i = 1; i < count; i++) {
    if (candidateAutoMode(binding, facts.semanticIds[i]!) !== first) {
      constant = false;
      break;
    }
  }
  if (constant) return new Uint8Array(count).fill(code);
  const column = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    column[i] = AUTO_MODE_CODE[candidateAutoMode(binding, facts.semanticIds[i]!) ?? first]!;
  }
  return column;
}

/** Null-only scratch reads as the null column (elided writes in the store). */
function styleColumnFrom(values: CellValue[]): CandidateStyleColumn {
  return values.every((v) => v === null) ? null : { kind: "column", values };
}

/**
 * Columnar twin of {@link createRawCandidateDatumResolver}: resolves the same
 * values a batch at a time, so dense source-backed layers never materialize
 * per-candidate objects. Two shapes:
 *
 * - CONTIGUOUS (all rows backed, ascending, one table — the dense common
 *   case): x/y/style/series columns are the table's own arrays (whole-column
 *   reuse) or ONE native slice per column; lineage is a single typed-array
 *   fill through `internSingleton`; ordinal ranks memoize `indexOf` per
 *   unique value.
 * - SCATTERED (NO_ROW gaps, multi-table, non-monotonic): per-candidate
 *   resolution mirroring the callback line-for-line, written into columns.
 *
 * Both reproduce the callback's observable semantics exactly, including the
 * early-`{}` cases: NO_ROW rows take store defaults everywhere (constants
 * dropped), while locatable-miss rows keep constants and singleton lineage.
 */
function createRawCandidateDatumColumnsResolver(input: {
  scene: Scene;
  bindings: readonly LayerBinding[];
  sources: SourceRegistry;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  lineage: LineageStore<number>;
  shared: ReturnType<typeof createRawResolverState>;
}): (facts: CandidateBatchFacts) => CandidateDatumColumns | null {
  const { scene, bindings, sources, lineage, shared } = input;
  const { stateFor, constantsFor, colorOrdinal, fillOrdinal } = shared;

  const contiguousColumns = (
    binding: LayerBinding,
    facts: CandidateBatchFacts,
    table: ColumnTable,
    localStart: number,
  ): CandidateDatumColumns | null => {
    const count = facts.primitiveIds.length;
    const state = stateFor(facts.layerIndex, table);
    // Slice semantics degrade exactly like the callback's out-of-bounds reads
    // (`column[localRow]` → undefined → null / `?? 0`), so columns shorter
    // than the run need no special-casing.
    const slice = <T>(column: readonly T[]): readonly T[] =>
      localStart === 0 && count === column.length
        ? column
        : column.slice(localStart, localStart + count);
    const localRow = (i: number): number => localStart + i;

    // Series: the groups array itself when the batch spans the table.
    const seriesId: ArrayLike<number> = slice(state.groups);

    // Ordinal ranks with the full colorRank → fillRank → group precedence.
    const colorRankOf =
      binding.color.field === null || state.color === null ? null : rankMemo(colorOrdinal);
    const fillRankOf =
      binding.fill.field === null || state.fill === null ? null : rankMemo(fillOrdinal);
    let seriesRank: ArrayLike<number> | null = null;
    if (colorRankOf !== null || fillRankOf !== null) {
      const ranks = Array.from<number>({ length: count });
      for (let i = 0; i < count; i++) {
        const row = localRow(i);
        const cr =
          colorRankOf === null || state.color === null ? -1 : colorRankOf(state.color[row]!);
        const fr = fillRankOf === null || state.fill === null ? -1 : fillRankOf(state.fill[row]!);
        const group = state.groups[row] ?? 0;
        ranks[i] = cr >= 0 ? cr : fr >= 0 ? fr : group;
      }
      seriesRank = ranks;
    }

    const lineageCol = new Uint32Array(count);
    for (let i = 0; i < count; i++) lineageCol[i] = lineage.internSingleton(facts.rowIds[i]!);

    return {
      xValue: state.x === null ? null : slice(state.x),
      yValue: state.y === null ? null : slice(state.y),
      sizeValue: styleColumn(state.size, slice),
      linewidthValue: styleColumn(state.linewidth, slice),
      alphaValue: styleColumn(state.alpha, slice),
      shapeValue: styleColumn(state.shape, slice),
      linetypeValue: styleColumn(state.linetype, slice),
      seriesId,
      seriesRank,
      sourceOrder: facts.rowIds,
      lineage: lineageCol,
      autoMode: autoModeColumn(binding, facts),
    };
  };

  const scatteredColumns = (
    binding: LayerBinding,
    facts: CandidateBatchFacts,
  ): CandidateDatumColumns => {
    const count = facts.primitiveIds.length;
    const batch = scene.batches[facts.batchIndex]!;
    const colorRankOf = binding.color.field === null ? null : rankMemo(colorOrdinal);
    const fillRankOf = binding.fill.field === null ? null : rankMemo(fillOrdinal);
    const xValues: CellValue[] = Array.from<CellValue>({ length: count }).fill(null);
    const yValues: CellValue[] = Array.from<CellValue>({ length: count }).fill(null);
    const styleScratch: Record<"size" | "linewidth" | "alpha" | "shape" | "linetype", CellValue[]> =
      {
        size: Array.from<CellValue>({ length: count }).fill(null),
        linewidth: Array.from<CellValue>({ length: count }).fill(null),
        alpha: Array.from<CellValue>({ length: count }).fill(null),
        shape: Array.from<CellValue>({ length: count }).fill(null),
        linetype: Array.from<CellValue>({ length: count }).fill(null),
      };
    const seriesCol = new Uint32Array(count);
    const rankCol = new Uint32Array(count);
    const sourceOrderCol = new Uint32Array(count);
    const lineageCol = new Uint32Array(count);
    const autoModeCol = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const rowId = facts.rowIds[i]!;
      const primitiveIndex = facts.primitiveIds[i]!;
      if (rowId === NO_ROW) {
        // Early `{}` return in the callback: store defaults everywhere.
        sourceOrderCol[i] = primitiveIndex;
        autoModeCol[i] = AUTO_MODE_CODE[defaultAutoMode(batch, primitiveIndex)]!;
        continue;
      }
      const located = sources.locate(rowId);
      const state =
        located === null
          ? constantsFor(facts.layerIndex)
          : stateFor(facts.layerIndex, located.table);
      const localRow = located?.localRow ?? -1;
      const read = (column: readonly CellValue[] | null): CellValue =>
        column === null || localRow < 0 ? null : column[localRow]!;
      const readStyle = (style: StyleRead): CellValue =>
        style.column === null ? style.constant : localRow < 0 ? null : style.column[localRow]!;
      xValues[i] = read(state.x);
      yValues[i] = read(state.y);
      styleScratch.size[i] = readStyle(state.size) ?? null;
      styleScratch.linewidth[i] = readStyle(state.linewidth) ?? null;
      styleScratch.alpha[i] = readStyle(state.alpha) ?? null;
      styleScratch.shape[i] = readStyle(state.shape) ?? null;
      styleScratch.linetype[i] = readStyle(state.linetype) ?? null;
      const group = localRow < 0 ? 0 : (state.groups[localRow] ?? 0);
      const cr =
        colorRankOf === null
          ? -1
          : colorRankOf(localRow < 0 || state.color === null ? null : state.color[localRow]!);
      const fr =
        fillRankOf === null
          ? -1
          : fillRankOf(localRow < 0 || state.fill === null ? null : state.fill[localRow]!);
      seriesCol[i] = group;
      rankCol[i] = cr >= 0 ? cr : fr >= 0 ? fr : group;
      sourceOrderCol[i] = rowId;
      lineageCol[i] = lineage.internSingleton(rowId);
      const mode = candidateAutoMode(binding, facts.semanticIds[i]!);
      autoModeCol[i] =
        mode === undefined
          ? AUTO_MODE_CODE[defaultAutoMode(batch, primitiveIndex)]
          : AUTO_MODE_CODE[mode];
    }
    return {
      xValue: xValues,
      yValue: yValues,
      sizeValue: styleColumnFrom(styleScratch.size),
      linewidthValue: styleColumnFrom(styleScratch.linewidth),
      alphaValue: styleColumnFrom(styleScratch.alpha),
      shapeValue: styleColumnFrom(styleScratch.shape),
      linetypeValue: styleColumnFrom(styleScratch.linetype),
      seriesId: seriesCol,
      seriesRank: rankCol,
      sourceOrder: sourceOrderCol,
      lineage: lineageCol,
      autoMode: autoModeCol,
    };
  };

  return (facts) => {
    const binding = bindings[facts.layerIndex];
    const count = facts.primitiveIds.length;
    if (binding === undefined || count === 0) return EMPTY_DATUM_COLUMNS;
    // Contiguity probe: every row backed and ascending by one, both ends in
    // the same table with matching local-row stride.
    const rowIds = facts.rowIds;
    let contiguous = rowIds[0] !== NO_ROW;
    for (let i = 1; contiguous && i < count; i++) {
      if (rowIds[i] !== rowIds[i - 1]! + 1) contiguous = false;
    }
    if (contiguous) {
      const first = sources.locate(rowIds[0]!);
      const last = sources.locate(rowIds[count - 1]!);
      if (
        first !== null &&
        last !== null &&
        first.table === last.table &&
        last.localRow - first.localRow === count - 1
      ) {
        return contiguousColumns(binding, facts, first.table, first.localRow);
      }
    }
    return scatteredColumns(binding, facts);
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
  const shared = createRawResolverState(bindings, color, fill);
  return buildCandidateStore(scene, {
    epoch: runId,
    flip,
    uninspectableLayers: uninspectableLayers(bindings),
    datum: createRawCandidateDatumResolver(bindings, sources, color, fill, lineage, shared),
    datumColumns: createRawCandidateDatumColumnsResolver({
      scene,
      bindings,
      sources,
      color,
      fill,
      lineage,
      shared,
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
