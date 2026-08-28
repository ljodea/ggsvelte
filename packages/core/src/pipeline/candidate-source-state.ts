import type { CellValue, ColumnTable } from "../table.js";
import { deriveLayerGroups } from "./frame-helpers.js";
import type { LayerBinding, ResolvedColorScale } from "./types.js";

/** One hoisted style read: a column to index, or a precomputed constant. */
export type StyleRead = { column: readonly CellValue[] | null; constant: CellValue };

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
export function createRawResolverState(
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
