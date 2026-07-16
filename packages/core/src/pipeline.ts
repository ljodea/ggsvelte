/**
 * runPipeline — the synchronous core pipeline (plan: "Core pipeline"):
 *
 *   spec -> normalize -> validate -> resolve theme -> bind data (ColumnTable,
 *     type inference) -> FACET PARTITION -> per panel, per layer: derive
 *     groups -> stat (per group) -> position adjust (stack/fill/dodge, data
 *     space) -> train scales (fixed: union across panels; free: positional
 *     domains per panel; discrete color/fill assignment ALWAYS global —
 *     one legend) -> legends measured -> bounded two-pass layout (axis
 *     titles + legends reserved INSIDE the loop; facet grids run the
 *     per-panel mirror of it) -> geometry (typed arrays, panel-local px;
 *     coord flip swaps the render axes here) -> Scene
 *
 * Facets partition BEFORE stats/positions (plan round-2 consensus): counts,
 * bins, stacks, and dodges are panel-local, exactly like ggplot2. The one
 * cross-panel coupling is deliberate: bin-stat BREAK GRIDS are shared across
 * panels when the x scale is fixed (ggplot2 derives breaks from the shared
 * scale dimension), and become per-panel under free_x.
 *
 * coord { type: "flip" } is the single orientation mechanism (no second
 * orientation code path): geometry is computed against the unflipped frame
 * with swapped extents, then vertices map (x, y) -> (W - y, H - x), so
 * stacks, dodges, band bars, rules, boxplots — everything — flips through
 * one transform. Axes/grid/hit geometry follow because they are derived
 * from the same swapped scales.
 *
 * Every heuristic emits a structured advisory { code, path, chosen,
 * howToOverride } (Hadley lesson 12) — the `scales` config surface makes the
 * howToOverride texts real. Data problems become warnings; spec problems
 * throw structured errors. Each call gets a monotonic run id — callers commit
 * the returned scale state only for the latest id.
 *
 * Failure policy (plan deliverable): empty data -> frame + axes placeholder;
 * empty layer -> skip + warning; all-null mapped column -> structured error;
 * zero-variance domain -> symmetric padding; log scales drop non-positive
 * values with a warning and REFUSE non-positive explicit domains.
 */
import type {
  Aes,
  BarParams,
  BoxplotParams,
  ChannelValue,
  ColorScaleSpec,
  ErrorbarParams,
  LayerSpec,
  PortableSpec,
  PositionParams,
  PositionScaleSpec,
  SmoothParams,
  SpecInput,
} from "@ggsvelte/spec";
import { didYouMean, normalize, SpecValidationError, validate } from "@ggsvelte/spec";

import { deriveGroups } from "./grouping.js";
import { FONT_METRICS } from "./layout/font-metrics.js";
import type { Domain, LayoutResult, Margins, PassResult, TickFormatter } from "./layout/layout.js";
import { DEFAULT_LAYOUT_THEME, layout, layoutPass } from "./layout/layout.js";
import { MetricsTableMeasurer } from "./layout/measure.js";
import { formatTime, numberFormatter } from "./layout/format.js";
import { defaultTickFormat, tickStep } from "./layout/ticks.js";
import { defaultLogTickFormat } from "./layout/ticks.js";
import { defaultTimeTickFormat } from "./layout/time.js";
import type { LegendInput, LegendOrder } from "./legend.js";
import { buildLegends } from "./legend.js";
import { trainSequential, VIRIDIS_RAMP_10 } from "./scales/color.js";
import type { ScaleState } from "./scales/state.js";
import { PaletteExhaustedError } from "./scales/state.js";
import type { ColorScale, ContinuousConfig, PositionScale } from "./scales/train.js";
import {
  bandKey,
  CATEGORICAL_PALETTE_10,
  finiteExtent,
  ScaleConfigError,
  trainBand,
  trainColor,
  trainContinuous,
} from "./scales/train.js";
import type {
  GeometryBatch,
  Scene,
  SceneAxis,
  SceneLegend,
  ScenePanel,
  SceneTick,
} from "./scene.js";
import { PANEL_SPACING, STRIP_BAND } from "./scene.js";
import { statBin } from "./stats/bin.js";
import { statBoxplot } from "./stats/boxplot.js";
import { statCount } from "./stats/count.js";
import { statDensity } from "./stats/density.js";
import { statSmooth } from "./stats/smooth.js";
import { statSummary } from "./stats/summary.js";
import { DEFAULT_JITTER_SEED, jitterOffsets, nudgeOffsets } from "./positions/jitter.js";
import { positionDodge, positionStack } from "./positions/positions.js";
import type { CellValue, Columns, Discreteness, Rows } from "./table.js";
import { cellsToNumeric, cellToNumber, ColumnTable } from "./table.js";
import type { EditionDefaults } from "./editions.js";
import { resolveEditionDefaults } from "./editions.js";
import type { ThemeTokens } from "./theme.js";
import { resolveTheme, UnknownThemeError } from "./theme.js";
import { perfMark, perfMeasure } from "./perf.js";
import { buildCandidateStore } from "./candidate-store.js";
import type {
  CandidateBuildFacts,
  CandidateDatum,
  ResolvedCandidateInspectMode,
} from "./candidate-store.js";
import { LineageStore } from "./identity.js";

import type {
  Advisory,
  AxisValueFormatter,
  ColorBinding,
  LayerBackend,
  LayerBinding,
  LayerFrame,
  MappedField,
  NamedData,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  RuleForm,
  RunOptions,
  ScaleDomainSnapshot,
} from "./pipeline/types.js";
import { CANVAS_AUTO_THRESHOLD, NO_ROW, PipelineError } from "./pipeline/types.js";
import { batchMarkCount, buildBatch, flipBatchInPlace } from "./pipeline/geometry.js";
import type { Frame } from "./pipeline/geometry.js";
import { resolveFacet, SINGLE_PANEL } from "./pipeline/facets.js";

// Re-export the public pipeline contract (import path stability).
export type {
  Advisory,
  AxisValueFormatter,
  LayerBackend,
  MappedField,
  NamedData,
  PipelineWarning,
  RenderModel,
  ResolvedColorScale,
  RunOptions,
  ScaleDomainSnapshot,
  TrainedScales,
} from "./pipeline/types.js";
export { CANVAS_AUTO_THRESHOLD, PipelineError } from "./pipeline/types.js";
export { batchMarkCount } from "./pipeline/geometry.js";

// ---------------------------------------------------------------------------
// Data binding
// ---------------------------------------------------------------------------

function tableFromNamed(data: NamedData): ColumnTable {
  if (Array.isArray(data)) return ColumnTable.fromRows(data);
  if ("values" in data && Array.isArray((data as { values: unknown }).values)) {
    return ColumnTable.fromRows((data as { values: Rows }).values);
  }
  if ("columns" in data && typeof (data as { columns: unknown }).columns === "object") {
    return ColumnTable.fromColumns((data as { columns: Columns }).columns);
  }
  return ColumnTable.fromColumns(data as Columns);
}

function bindData(spec: PortableSpec, options: RunOptions): ColumnTable {
  const ref = spec.data;
  if (ref === undefined) {
    throw new PipelineError(
      "no-data",
      "/data",
      "The spec has no data. Provide spec.data ({values}, {columns}, or {name}) or layer data.",
    );
  }
  if ("values" in ref) return ColumnTable.fromRows(ref.values);
  if ("columns" in ref) return ColumnTable.fromColumns(ref.columns);
  const name = ref.name;
  const fromSpec = spec.datasets?.[name];
  const fromRun = options.data?.[name];
  if (fromSpec !== undefined && fromRun !== undefined && options.allowOverride !== true) {
    throw new PipelineError(
      "dataset-collision",
      "/data/name",
      `Dataset "${name}" is defined in both spec.datasets and RunOptions.data. ` +
        "Pass allowOverride: true to let the runtime data win, or rename one.",
    );
  }
  if (fromRun !== undefined && (fromSpec === undefined || options.allowOverride === true)) {
    return tableFromNamed(fromRun);
  }
  if (fromSpec !== undefined) return tableFromNamed(fromSpec);
  const available = [...Object.keys(spec.datasets ?? {}), ...Object.keys(options.data ?? {})];
  throw new PipelineError(
    "unknown-dataset",
    "/data/name",
    `Unknown dataset "${name}". Available: ${available.length > 0 ? available.join(", ") : "none"}.`,
  );
}

// ---------------------------------------------------------------------------
// Layer binding (channel resolution + structural rules)
// ---------------------------------------------------------------------------

/** y-channel { stat } columns each stat exposes (module-header contracts). */
const STAT_Y_COLUMNS: Record<string, readonly string[]> = {
  identity: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: [],
  boxplot: [],
  summary: [],
};

function checkField(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): string | null {
  if (channel === undefined || channel === null) return null;
  if (!("field" in channel)) return null;
  if (!table.has(channel.field)) {
    const suggestion = didYouMean(channel.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Unknown field "${channel.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  if (allNull(table.column(channel.field))) {
    throw new PipelineError(
      "all-null-column",
      `/layers/${layerIndex}/aes/${channelName}`,
      `Field "${channel.field}" contains only null values; the "${channelName}" channel cannot be drawn from it.`,
    );
  }
  void warnings;
  return channel.field;
}

function allNull(column: readonly CellValue[]): boolean {
  if (column.length === 0) return false;
  for (const v of column) if (v !== null) return false;
  return true;
}

function requireField(
  field: string | null,
  channelName: string,
  layerIndex: number,
  geom: string,
): string {
  if (field === null) {
    throw new PipelineError(
      "missing-channel",
      `/layers/${layerIndex}/aes/${channelName}`,
      `The ${geom} geom requires a "${channelName}" channel (map it with aes).`,
    );
  }
  return field;
}

function colorBinding(
  channel: ChannelValue | undefined,
  channelName: string,
  layerIndex: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): ColorBinding {
  const out: ColorBinding = { field: null, constant: null, scaledConstant: null };
  if (channel === undefined || channel === null) return out;
  if ("field" in channel) {
    out.field = checkField(channel, channelName, layerIndex, table, warnings);
  } else if ("value" in channel) {
    if (channel.scale === true) out.scaledConstant = channel.value;
    else out.constant = String(channel.value);
  } else {
    warnings.push({
      code: "stat-channel-unsupported",
      message: `Layer ${layerIndex}: { stat } mappings on the "${channelName}" channel are not supported yet; the mapping is ignored.`,
    });
  }
  return out;
}

function bindLayer(
  layer: LayerSpec,
  index: number,
  table: ColumnTable,
  warnings: PipelineWarning[],
): LayerBinding {
  const aes: Aes = layer.aes ?? {};
  const geom = layer.geom;
  const params = layer.params ?? {};

  // --- rule: two honest forms ------------------------------------------------
  let ruleForm: RuleForm | null = null;
  if (geom === "rule") {
    const p = params as { xintercept?: unknown; yintercept?: unknown };
    const hasIntercepts = p.xintercept !== undefined || p.yintercept !== undefined;
    const xMapped = aes.x !== undefined && aes.x !== null;
    const yMapped = aes.y !== undefined && aes.y !== null;
    if (hasIntercepts && (xMapped || yMapped)) {
      throw new PipelineError(
        "rule-form-ambiguous",
        `/layers/${index}`,
        "This rule layer mixes the annotation form (params.xintercept/yintercept) with mapped aes.x/aes.y. Use fixed intercepts OR a data mapping, never both.",
      );
    }
    if (!hasIntercepts && !xMapped && !yMapped) {
      throw new PipelineError(
        "rule-form-missing",
        `/layers/${index}`,
        "This rule layer has neither fixed intercepts (params.xintercept/yintercept) nor a mapped aes.x/aes.y — nothing to draw.",
      );
    }
    if (!hasIntercepts && xMapped && yMapped) {
      throw new PipelineError(
        "rule-both-axes",
        `/layers/${index}`,
        "This rule layer maps BOTH aes.x and aes.y; a data-driven rule is either vertical (map x) or horizontal (map y). Unset the other channel with null.",
      );
    }
    ruleForm = hasIntercepts ? "annotation" : xMapped ? "vertical" : "horizontal";
  }

  const stat = layer.stat ?? "identity";
  const xField = checkField(aes.x, "x", index, table, warnings);
  let yField: string | null = null;
  let yStatColumn: string | null = null;
  const y = aes.y;
  if (y !== undefined && y !== null && "stat" in y) {
    const generated = STAT_Y_COLUMNS[stat] ?? [];
    if (!generated.includes(y.stat)) {
      throw new PipelineError(
        "unknown-stat-column",
        `/layers/${index}/aes/y`,
        `Channel "y" maps stat column "${y.stat}", but this layer's stat ("${stat}") ${generated.length > 0 ? `generates: ${generated.join(", ")}` : "generates no y-mappable columns"}.`,
      );
    }
    yStatColumn = y.stat;
  } else {
    yField = checkField(y, "y", index, table, warnings);
  }

  if (geom === "bar" && yField !== null) {
    throw new PipelineError(
      "computed-y-mapped",
      `/layers/${index}/aes/y`,
      `The bar geom computes y with the ${stat} stat, so aes.y must not map data. Use geom "col" for pre-computed heights.`,
    );
  }
  if (geom === "density" && yField !== null) {
    throw new PipelineError(
      "computed-y-mapped",
      `/layers/${index}/aes/y`,
      "The density geom computes y with the density stat, so aes.y must not map data. Map only x.",
    );
  }
  if (stat === "bin") {
    const p = params as BarParams;
    if (p.center !== undefined && p.boundary !== undefined) {
      throw new PipelineError(
        "bin-center-and-boundary",
        `/layers/${index}/params`,
        "The bin stat accepts params.center OR params.boundary (both align the bin grid), never both.",
      );
    }
    if (xField !== null && table.fieldType(xField) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The bin stat needs a continuous x, but field "${xField}" is nominal. Use geom "bar" (the count stat) to count categories instead.`,
      );
    }
  }
  if (geom === "density" && xField !== null && table.fieldType(xField) === "nominal") {
    throw new PipelineError(
      "channel-type-mismatch",
      `/layers/${index}/aes/x`,
      `The density stat needs a continuous x, but field "${xField}" is nominal. Use geom "bar" (the count stat) to count categories instead.`,
    );
  }
  if (geom === "smooth") {
    for (const [channel, field] of [
      ["x", xField],
      ["y", yField],
    ] as const) {
      if (field !== null && table.fieldType(field) === "nominal") {
        throw new PipelineError(
          "channel-type-mismatch",
          `/layers/${index}/aes/${channel}`,
          `The smooth stat needs quantitative x and y, but field "${field}" (${channel}) is nominal.`,
        );
      }
    }
  }
  if (geom === "boxplot") {
    if (xField !== null && table.fieldType(xField) !== "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/x`,
        `The boxplot geom needs a DISCRETE x this milestone, but field "${xField}" is ${table.fieldType(xField)}. Map x to a categorical field.`,
      );
    }
    if (yField !== null && table.fieldType(yField) === "nominal") {
      throw new PipelineError(
        "channel-type-mismatch",
        `/layers/${index}/aes/y`,
        `The boxplot stat needs a quantitative y, but field "${yField}" is nominal.`,
      );
    }
  }

  // --- ymin/ymax (errorbar identity form) --------------------------------------
  const yminField = checkField(aes.ymin, "ymin", index, table, warnings);
  const ymaxField = checkField(aes.ymax, "ymax", index, table, warnings);

  // --- required channels ------------------------------------------------------
  if (
    geom === "point" ||
    geom === "line" ||
    geom === "col" ||
    geom === "area" ||
    geom === "text" ||
    geom === "smooth" ||
    geom === "boxplot"
  ) {
    requireField(xField, "x", index, geom);
    if (yStatColumn === null) requireField(yField, "y", index, geom);
  }
  if (geom === "bar" || geom === "density") requireField(xField, "x", index, geom);
  if (geom === "errorbar") {
    requireField(xField, "x", index, geom);
    if (stat === "summary") {
      requireField(yField, "y", index, geom);
    } else {
      requireField(yminField, "ymin", index, geom);
      requireField(ymaxField, "ymax", index, geom);
    }
  }
  if (geom === "rule" && ruleForm === "vertical") requireField(xField, "x", index, geom);
  if (geom === "rule" && ruleForm === "horizontal") requireField(yField, "y", index, geom);

  // --- label / weight ----------------------------------------------------------
  let labelField: string | null = null;
  let labelConstant: string | null = null;
  const label = aes.label;
  if (label !== undefined && label !== null) {
    if ("field" in label) labelField = checkField(label, "label", index, table, warnings);
    else if ("value" in label) labelConstant = String(label.value);
  }
  if (geom === "text" && labelField === null && labelConstant === null) {
    throw new PipelineError(
      "missing-channel",
      `/layers/${index}/aes/label`,
      'The text geom requires a "label" channel (map it with aes).',
    );
  }
  const weightField = checkField(aes.weight, "weight", index, table, warnings);

  const color = colorBinding(aes.color, "color", index, table, warnings);
  const fill = colorBinding(aes.fill, "fill", index, table, warnings);
  if (
    (geom === "bar" ||
      geom === "col" ||
      geom === "area" ||
      geom === "boxplot" ||
      geom === "density") &&
    (color.field !== null || color.constant !== null || color.scaledConstant !== null)
  ) {
    warnings.push({
      code: "color-on-fill-geom",
      message: `Layer ${index} (${geom}): the color channel styles OUTLINES, which this geom does not support as a data channel yet — map "fill" instead. The color mapping is ignored.`,
    });
    color.field = null;
    color.constant = null;
    color.scaledConstant = null;
  }
  if (weightField !== null && (stat === "boxplot" || stat === "smooth" || stat === "summary")) {
    warnings.push({
      code: "weight-unsupported",
      message: `Layer ${index}: the ${stat} stat does not support aes.weight; the weight mapping is ignored.`,
    });
  }

  return {
    layer,
    index,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    color,
    fill,
    labelField,
    labelConstant,
    weightField,
    ruleForm,
  };
}

// ---------------------------------------------------------------------------
// Layer frames (post-stat, post-position data)
// ---------------------------------------------------------------------------

/** Fresh all-null frame extras (each stat branch fills what it uses). */
function emptyFrameExtras(): Pick<
  LayerFrame,
  | "ymin"
  | "ymax"
  | "xmin"
  | "xmax"
  | "dodgeSlot"
  | "dodgeSlotCounts"
  | "offsetX"
  | "offsetY"
  | "box"
  | "smoothBand"
  | "xIntercepts"
  | "yIntercepts"
> {
  return {
    ymin: null,
    ymax: null,
    xmin: null,
    xmax: null,
    dodgeSlot: null,
    dodgeSlotCounts: null,
    offsetX: null,
    offsetY: null,
    box: null,
    smoothBand: false,
    xIntercepts: [],
    yIntercepts: [],
  };
}

function interceptList(value: unknown): CellValue[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value as CellValue[];
  return [value as CellValue];
}

function deriveLayerGroups(binding: LayerBinding, table: ColumnTable): number[] {
  const aes = binding.layer.aes ?? {};
  const declared: Record<string, Discreteness> = {};
  for (const mapping of Object.values(aes)) {
    if (
      mapping !== null &&
      mapping !== undefined &&
      "field" in mapping &&
      table.has(mapping.field)
    ) {
      declared[mapping.field] = table.discreteness(mapping.field);
    }
  }
  return [...deriveGroups(table.columns(), aes, declared).groups];
}

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
    const ordinalRank = (resolved: ResolvedColorScale | null, field: string | null) => {
      if (resolved?.kind !== "ordinal" || field === null) return -1;
      const key = bandKey(value(field));
      return resolved.scale.domain.findIndex((domainValue) => bandKey(domainValue) === key);
    };
    const colorRank = ordinalRank(color, binding.color.field);
    const fillRank = ordinalRank(fill, binding.fill.field);
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

function candidateAutoMode(
  binding: LayerBinding,
  primitiveIndex: number,
): ResolvedCandidateInspectMode {
  switch (binding.layer.geom) {
    case "point":
    case "text":
      return "xy";
    case "col":
    case "bar":
      return "exact";
    case "line":
    case "area":
    case "density":
    case "smooth":
    case "errorbar":
    case "boxplot":
      return "x";
    case "rule": {
      if (binding.ruleForm === "vertical") return "x";
      if (binding.ruleForm === "horizontal") return "y";
      const params = (binding.layer.params ?? {}) as { xintercept?: unknown };
      return primitiveIndex < interceptList(params.xintercept).length ? "x" : "y";
    }
    default:
      return "xy";
  }
}

/** Carried discrete columns for stats (color/fill/label, minus the x field). */
function carriedColumns(
  binding: LayerBinding,
  table: ColumnTable,
): Record<string, readonly CellValue[]> {
  const carried: Record<string, readonly CellValue[]> = {};
  for (const field of [binding.color.field, binding.fill.field, binding.labelField]) {
    if (field !== null && field !== binding.xField) carried[field] = table.column(field);
  }
  return carried;
}

function removedStatWarning(
  dropped: number,
  index: number,
  what: string,
  warnings: PipelineWarning[],
): void {
  if (dropped > 0) {
    warnings.push({
      code: "removed-missing",
      message: `Removed ${dropped} row(s) with ${what} (layer ${index}).`,
    });
  }
}

function buildFrame(
  binding: LayerBinding,
  table: ColumnTable,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  binRange?: [number, number],
): LayerFrame {
  const { layer, index } = binding;
  const n = table.rowCount;

  if (binding.ruleForm === "annotation") {
    const params = (layer.params ?? {}) as { xintercept?: unknown; yintercept?: unknown };
    return {
      binding,
      table,
      n: 0,
      xValues: null,
      xNumeric: null,
      yNumeric: null,
      groups: [],
      rowIndex: new Uint32Array(0),
      colorValues: null,
      fillValues: null,
      labelValues: null,
      ...emptyFrameExtras(),
      xIntercepts: interceptList(params.xintercept),
      yIntercepts: interceptList(params.yintercept),
    };
  }

  const groups = deriveLayerGroups(binding, table);
  const stat = layer.stat ?? "identity";
  const carried = carriedColumns(binding, table);
  const columnOf =
    (result: { carried: Record<string, CellValue[]> }, x: readonly CellValue[] | null) =>
    (field: string | null): readonly CellValue[] | null =>
      field === null ? null : field === binding.xField ? x : (result.carried[field] ?? null);

  if (stat === "count") {
    const xField = binding.xField!;
    const result = statCount({
      x: table.column(xField),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
    });
    removedStatWarning(
      result.dropped,
      index,
      "missing x or non-finite weight before counting",
      warnings,
    );
    const col = columnOf(result, result.x);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: result.x,
      xNumeric: cellsToNumeric(result.x),
      yNumeric: binding.yStatColumn === "count" ? result.count : null,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
    };
  }

  if (stat === "bin") {
    const result = statBin({
      x: table.numeric(binding.xField!),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
      params: (layer.params ?? {}) as BarParams,
      // Fixed-x facets share one break grid across panels (ggplot2 derives
      // breaks from the shared scale dimension); free_x omits this.
      ...(binRange !== undefined && { range: binRange }),
    });
    removedStatWarning(result.dropped, index, "missing or non-finite x before binning", warnings);
    if (result.usedDefaultBins && result.x.length > 0) {
      // Hadley lesson 12 — the model advisory: geom_histogram's
      // "`stat_bin()` using `bins = 30`. Pick better value with `binwidth`."
      advisories.push({
        code: "bin-default-bins",
        path: `layers.${index}`,
        chosen: "stat bin using bins = 30",
        howToOverride: `Set params.binwidth (preferred — a width meaningful for the data) or params.bins on layer ${index}.`,
      });
    }
    const columns: Record<string, Float64Array> = {
      count: result.count,
      density: result.density,
      ncount: result.ncount,
      ndensity: result.ndensity,
    };
    const col = columnOf(result, null);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: null,
      xNumeric: result.x,
      yNumeric: columns[binding.yStatColumn ?? "count"] ?? result.count,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      xmin: result.xmin,
      xmax: result.xmax,
    };
  }

  if (stat === "density") {
    const result = statDensity({
      x: table.numeric(binding.xField!),
      groups,
      weights: binding.weightField === null ? null : table.numeric(binding.weightField),
      carried,
      params: (layer.params ?? {}) as { bw?: number; adjust?: number; n?: number; cut?: number },
    });
    removedStatWarning(result.dropped, index, "missing or non-finite x", warnings);
    if (result.droppedGroups > 0) {
      warnings.push({
        code: "density-group-dropped",
        message: `Layer ${index} (density): ${result.droppedGroups} group(s) with fewer than two data points have been dropped.`,
      });
    }
    const columns: Record<string, Float64Array> = {
      density: result.density,
      count: result.count,
      scaled: result.scaled,
      ndensity: result.ndensity,
    };
    const yNumeric = columns[binding.yStatColumn ?? "density"] ?? result.density;
    const col = columnOf(result, null);
    const outN = result.x.length;
    return {
      binding,
      table,
      n: outN,
      xValues: null,
      xNumeric: result.x,
      yNumeric,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: outN }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      // Density renders as an area from the zero baseline.
      ymin: new Float64Array(outN),
      ymax: yNumeric,
    };
  }

  if (stat === "smooth") {
    const params = (layer.params ?? {}) as SmoothParams;
    const result = statSmooth({
      x: table.numeric(binding.xField!),
      y: table.numeric(binding.yField!),
      groups,
      carried,
      params,
    });
    removedStatWarning(result.dropped, index, "missing or non-finite x/y", warnings);
    if (result.droppedGroups > 0) {
      warnings.push({
        code: "smooth-group-dropped",
        message: `Layer ${index} (smooth): ${result.droppedGroups} group(s) too small or degenerate to fit have been dropped.`,
      });
    }
    if (result.methodInferred && result.x.length > 0) {
      advisories.push({
        code: "smooth-method-inferred",
        path: `layers.${index}`,
        chosen: `stat smooth using method = "${result.methodUsed}" (largest group ${result.methodUsed === "loess" ? "<" : ">="} 1000 rows; ggplot2 would escalate to gam, which ggsvelte does not ship)`,
        howToOverride: `Set params.method ("lm" | "loess") on layer ${index}.`,
      });
    }
    const col = columnOf(result, null);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: null,
      xNumeric: result.x,
      yNumeric: result.y,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      ymin: result.ymin,
      ymax: result.ymax,
      smoothBand: result.hasBand,
    };
  }

  if (stat === "boxplot") {
    const params = (layer.params ?? {}) as BoxplotParams;
    const result = statBoxplot({
      x: table.column(binding.xField!),
      y: table.numeric(binding.yField!),
      groups,
      ...(params.coef !== undefined && { coef: params.coef }),
      carried,
    });
    removedStatWarning(result.dropped, index, "missing or non-finite y", warnings);
    const col = columnOf(result, result.x);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: result.x,
      xNumeric: null,
      yNumeric: null,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      ymin: result.ymin,
      ymax: result.ymax,
      box: {
        lower: result.lower,
        middle: result.middle,
        upper: result.upper,
        outlierX: result.outliers.map((o) => o.x),
        outlierY: Float64Array.from(result.outliers.map((o) => o.y)),
        outlierBox: Uint32Array.from(result.outliers.map((o) => o.boxRow)),
        outlierRow: Uint32Array.from(result.outliers.map((o) => o.sourceRow)),
      },
    };
  }

  if (stat === "summary") {
    const params = (layer.params ?? {}) as ErrorbarParams;
    const result = statSummary({
      x: table.column(binding.xField!),
      y: table.numeric(binding.yField!),
      groups,
      fun: params.fun,
      funMin: params.funMin,
      funMax: params.funMax,
      carried,
    });
    removedStatWarning(result.dropped, index, "missing x or non-finite y", warnings);
    const col = columnOf(result, result.x);
    return {
      binding,
      table,
      n: result.x.length,
      xValues: result.x,
      xNumeric: cellsToNumeric(result.x),
      yNumeric: result.y,
      groups: result.groups,
      rowIndex: Uint32Array.from({ length: result.x.length }, () => NO_ROW),
      colorValues: col(binding.color.field),
      fillValues: col(binding.fill.field),
      labelValues: col(binding.labelField),
      ...emptyFrameExtras(),
      ymin: result.ymin,
      ymax: result.ymax,
    };
  }

  // --- identity ----------------------------------------------------------------
  return {
    binding,
    table,
    n,
    xValues: binding.xField === null ? null : table.column(binding.xField),
    xNumeric: binding.xField === null ? null : table.numeric(binding.xField),
    yNumeric: binding.yField === null ? null : table.numeric(binding.yField),
    groups,
    rowIndex: Uint32Array.from({ length: n }, (_, i) => i),
    colorValues: binding.color.field === null ? null : table.column(binding.color.field),
    fillValues: binding.fill.field === null ? null : table.column(binding.fill.field),
    labelValues: binding.labelField === null ? null : table.column(binding.labelField),
    ...emptyFrameExtras(),
    ymin: binding.yminField === null ? null : table.numeric(binding.yminField),
    ymax: binding.ymaxField === null ? null : table.numeric(binding.ymaxField),
  };
}

/** Geoms whose marks extend from a zero baseline on the measure (y) axis. */
function isBarLike(geom: LayerSpec["geom"]): boolean {
  return geom === "bar" || geom === "col" || geom === "area";
}

/** Per-row slot keys: band categories, or bin centers for binned bars. */
function slotKeys(frame: LayerFrame): (number | string)[] | null {
  if (frame.xValues !== null) return frame.xValues.map((v) => bandKey(v));
  if (frame.xNumeric !== null) return Array.from(frame.xNumeric);
  return null;
}

function applyPosition(frame: LayerFrame, advisories: Advisory[], table: ColumnTable): void {
  const { binding } = frame;
  const layer = binding.layer;
  const geom = layer.geom;

  // --- jitter / nudge (point + text layers) -----------------------------------
  if (geom === "point" || geom === "text") {
    const position = layer.position ?? "identity";
    if (position === "identity") return;
    const params: PositionParams = "positionParams" in layer ? (layer.positionParams ?? {}) : {};
    // Offsets are band-step fractions on discrete axes (resolution 1),
    // data units on continuous axes.
    const xDiscrete = binding.xField !== null && table.discreteness(binding.xField) === "discrete";
    const yDiscrete = binding.yField !== null && table.discreteness(binding.yField) === "discrete";
    if (position === "nudge") {
      const { dx, dy } = nudgeOffsets(frame.n, params.x ?? 0, params.y ?? 0);
      frame.offsetX = dx;
      frame.offsetY = dy;
      return;
    }
    // jitter (point only, schema-enforced): seeded — deliberate divergence
    // from ggplot2's random jitter (decision 0010), always surfaced.
    const { dx, dy } = jitterOffsets({
      n: frame.n,
      width: params.width,
      height: params.height,
      seed: params.seed,
      xNumeric: xDiscrete ? null : frame.xNumeric,
      yNumeric: yDiscrete ? null : frame.yNumeric,
    });
    frame.offsetX = dx;
    frame.offsetY = dy;
    advisories.push({
      code: "jitter-seeded",
      path: `layers.${binding.index}`,
      chosen: `deterministic seeded jitter (seed ${params.seed ?? DEFAULT_JITTER_SEED}) — ggplot2 draws new random offsets every render; ggsvelte seeds for reproducibility`,
      howToOverride: `Set positionParams.seed (and width/height) on layer ${binding.index}.`,
    });
    return;
  }

  // --- boxplot dodge -----------------------------------------------------------
  if (geom === "boxplot") {
    if ((layer.position ?? "dodge") !== "dodge" || frame.xValues === null) return;
    const dodge = positionDodge({
      slots: frame.xValues.map((v) => bandKey(v)),
      groups: frame.groups,
    });
    frame.dodgeSlot = dodge.slot;
    frame.dodgeSlotCounts = dodge.slotCount;
    return;
  }

  // --- bar-like stack/fill/dodge ------------------------------------------------
  if (!isBarLike(geom) || frame.yNumeric === null) return;
  const slots = slotKeys(frame);
  if (slots === null) return;
  const position = layer.position ?? "identity";
  const y = frame.yNumeric;

  if (position === "stack" || position === "fill") {
    const { ymin, ymax } = positionStack({ slots, groups: frame.groups, y, mode: position });
    frame.ymin = ymin;
    frame.ymax = ymax;
    return;
  }
  // identity / dodge: bars grow from the zero baseline.
  const ymin = new Float64Array(frame.n);
  const ymax = new Float64Array(frame.n);
  for (let i = 0; i < frame.n; i++) {
    const v = Number.isFinite(y[i]!) ? y[i]! : 0;
    ymin[i] = Math.min(0, v);
    ymax[i] = Math.max(0, v);
  }
  frame.ymin = ymin;
  frame.ymax = ymax;
  if (position === "dodge") {
    const dodge = positionDodge({ slots, groups: frame.groups });
    frame.dodgeSlot = dodge.slot;
    frame.dodgeSlotCounts = dodge.slotCount;
  }
}

// ---------------------------------------------------------------------------
// Scale configuration + training
// ---------------------------------------------------------------------------

const POSITION_TYPE_OVERRIDE =
  'Set scales.AXIS.type ("linear" | "log" | "time" | "band") in the spec.';

function continuousDomainOf(
  config: PositionScaleSpec | undefined,
  axis: "x" | "y",
): [number, number] | undefined {
  if (config?.domain === undefined) return undefined;
  if (config.domain.length !== 2) {
    throw new PipelineError(
      "invalid-scale-domain",
      `/scales/${axis}/domain`,
      `A continuous ${axis} domain needs exactly [min, max] (got ${config.domain.length} entries).`,
    );
  }
  const lo = cellToNumber(config.domain[0] as CellValue);
  const hi = cellToNumber(config.domain[1] as CellValue);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    throw new PipelineError(
      "invalid-scale-domain",
      `/scales/${axis}/domain`,
      `The ${axis} domain [${String(config.domain[0])}, ${String(config.domain[1])}] does not parse to finite numbers (use numbers, or ISO 8601 strings for time scales).`,
    );
  }
  return lo <= hi ? [lo, hi] : [hi, lo];
}

interface AxisTraining {
  scale: PositionScale;
  advisories: Advisory[];
  warnings: PipelineWarning[];
}

interface AxisInputs {
  /** Discrete columns contributing to a band domain. */
  columns: (readonly CellValue[])[];
  /** Continuous numeric arrays (post-stat / post-position). */
  numeric: Float64Array[];
  /** True when any contributing field is discrete or a geom forces bands. */
  anyDiscrete: boolean;
  /** True when every contributing field is temporal (and none discrete). */
  allTemporal: boolean;
  /** True when a bar-like geom measures on this axis (zero forcing). */
  barMeasure: boolean;
  /** Human-readable description of the evidence (advisory text). */
  evidence: string;
}

function trainAxis(
  axis: "x" | "y",
  inputs: AxisInputs,
  config: PositionScaleSpec | undefined,
): AxisTraining {
  const advisories: Advisory[] = [];
  const warnings: PipelineWarning[] = [];
  const howToOverride = POSITION_TYPE_OVERRIDE.replace("AXIS", axis);

  let type = config?.type;
  if (type === undefined) {
    type = inputs.anyDiscrete ? "band" : inputs.allTemporal ? "time" : "linear";
    advisories.push({
      code: "scale-type-inferred",
      path: `scales.${axis}`,
      chosen: `${type} (${inputs.evidence})`,
      howToOverride,
    });
  }

  if (type === "band") {
    const domain = config?.domain;
    const scale = trainBand(inputs.columns, {
      ...(domain !== undefined && { domain }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
    });
    if (scale.domain.length === 0) {
      warnings.push({
        code: "empty-domain",
        message: `The ${axis} band scale has no categories.`,
      });
    }
    return { scale, advisories, warnings };
  }

  // --- continuous ------------------------------------------------------------
  let zero = config?.zero;
  if (inputs.barMeasure && type !== "time" && zero === undefined && config?.domain === undefined) {
    zero = true;
    advisories.push({
      code: "zero-forced",
      path: `scales.${axis}`,
      chosen: "domain extended to include 0 (bars/areas measure from a zero baseline)",
      howToOverride: `Set scales.${axis}.zero to false, or pin scales.${axis}.domain.`,
    });
  }

  const domain = continuousDomainOf(config, axis);
  const continuousConfig: ContinuousConfig = {
    type,
    ...(domain !== undefined && { domain }),
    ...(config?.nice !== undefined && { nice: config.nice }),
    ...(zero !== undefined && { zero }),
    ...(config?.reverse !== undefined && { reverse: config.reverse }),
  };
  let training;
  try {
    training = trainContinuous(inputs.numeric, continuousConfig);
  } catch (error) {
    if (error instanceof ScaleConfigError) {
      throw new PipelineError(error.code, `/scales/${axis}`, error.message);
    }
    throw error;
  }
  if (training.empty) {
    warnings.push({
      code: "empty-domain",
      message: `The ${axis} scale has no finite${type === "log" ? " positive" : ""} values; using a default domain.`,
    });
  }
  if (training.nonPositive > 0) {
    warnings.push({
      code: "log-nonpositive",
      message: `Removed ${training.nonPositive} non-positive value(s) from the ${axis} log scale (log10 is undefined at or below zero).`,
    });
  }
  return { scale: training.scale, advisories, warnings };
}

/** Collect per-axis training evidence across layers. */
function collectAxisInputs(
  axis: "x" | "y",
  frames: readonly LayerFrame[],
  configType: PositionScaleSpec["type"] | undefined,
  advisories: Advisory[],
): AxisInputs {
  const columns: (readonly CellValue[])[] = [];
  const numeric: Float64Array[] = [];
  let anyDiscrete = false;
  let allTemporal = true;
  let sawContinuousEvidence = false;
  let barMeasure = false;
  const typeParts = new Set<string>();

  for (const frame of frames) {
    const { binding } = frame;
    const geom = binding.layer.geom;

    if (axis === "x") {
      if (frame.xmin !== null && frame.xmax !== null) {
        // Binned bars: the x domain is the union of bin edges (continuous).
        numeric.push(frame.xmin, frame.xmax);
        const field = binding.xField!;
        const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
        typeParts.add(`binned ${fieldType}`);
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      } else if (frame.xValues !== null || frame.xNumeric !== null) {
        if (frame.xValues !== null) columns.push(frame.xValues);
        if (frame.xNumeric !== null) numeric.push(frame.xNumeric);
        const field = binding.xField!;
        const fieldType = frame.table.has(field) ? frame.table.fieldType(field) : "quantitative";
        typeParts.add(fieldType);
        const barX = (geom === "bar" || geom === "col") && binding.layer.stat !== "bin";
        if (barX && fieldType !== "nominal" && configType === undefined) {
          advisories.push({
            code: "bar-x-discretized",
            path: `layers.${binding.index}`,
            chosen: `x treated as discrete bands (${geom} geom)`,
            howToOverride: "Use point/line/area for continuous x, or set scales.x.type explicitly.",
          });
        }
        if (barX || fieldType === "nominal") anyDiscrete = true;
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      }
      if (frame.box !== null && frame.box.outlierX.length > 0) {
        columns.push(frame.box.outlierX);
      }
      for (const v of frame.xIntercepts) {
        columns.push([v]);
        numeric.push(Float64Array.of(cellToNumber(v)));
        if (typeof v === "string" && !Number.isFinite(cellToNumber(v))) anyDiscrete = true;
        sawContinuousEvidence = true;
      }
    } else {
      if (isBarLike(geom) || geom === "density") barMeasure = true;
      if (frame.ymin !== null && frame.ymax !== null) {
        numeric.push(frame.ymin, frame.ymax);
        // Bands need not cover the center line (se: false smooths have
        // NaN bands; the summary center can escape min/max bounds).
        if ((geom === "smooth" || geom === "errorbar") && frame.yNumeric !== null) {
          numeric.push(frame.yNumeric);
        }
        if (frame.box !== null) numeric.push(frame.box.outlierY);
        typeParts.add("quantitative");
        allTemporal = false;
        sawContinuousEvidence = true;
      } else if (binding.yStatColumn !== null && frame.yNumeric !== null) {
        numeric.push(frame.yNumeric);
        typeParts.add(binding.yStatColumn);
        allTemporal = false;
        sawContinuousEvidence = true;
      } else if (binding.yField !== null) {
        // Panel-local data: free-y facets train each panel on ITS rows.
        const column = frame.table.column(binding.yField);
        columns.push(column);
        numeric.push(frame.table.numeric(binding.yField));
        const fieldType = frame.table.fieldType(binding.yField);
        typeParts.add(fieldType);
        if (fieldType === "nominal") anyDiscrete = true;
        if (fieldType !== "temporal") allTemporal = false;
        sawContinuousEvidence = true;
      }
      for (const v of frame.yIntercepts) {
        columns.push([v]);
        numeric.push(Float64Array.of(cellToNumber(v)));
        sawContinuousEvidence = true;
      }
    }
  }

  return {
    columns,
    numeric,
    anyDiscrete,
    allTemporal: allTemporal && sawContinuousEvidence,
    barMeasure,
    evidence: `field type: ${[...typeParts].join("+") || "none"}`,
  };
}

// ---------------------------------------------------------------------------
// Color / fill scale resolution
// ---------------------------------------------------------------------------

interface ColorResolution {
  resolved: ResolvedColorScale | null;
  legendInput: LegendInput | null;
  state: ScaleState | null;
}

function resolveColorScale(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
  config: ColorScaleSpec | undefined,
  prevState: ScaleState | null,
  legendTitle: string,
  warnings: PipelineWarning[],
  advisories: Advisory[],
  editionDefaults: EditionDefaults,
): ColorResolution {
  const values: CellValue[] = [];
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (channel.field !== null && frameValues !== null) {
      anyField = true;
      if (table.has(channel.field) && table.discreteness(channel.field) === "discrete") {
        anyDiscreteField = true;
      }
      for (const v of frameValues) values.push(v);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      values.push(channel.scaledConstant);
    }
  }
  if (!anyField) return { resolved: null, legendInput: null, state: null };

  const type = config?.type ?? (anyDiscreteField ? "ordinal" : "sequential");

  if (type === "sequential") {
    if (anyDiscreteField) {
      warnings.push({
        code: "sequential-discrete-field",
        message: `The ${name} scale is sequential but a mapped field is discrete; values that do not parse as numbers render the unknown color.`,
      });
    }
    const numeric = cellsToNumeric(values);
    const extent = finiteExtent([numeric]);
    const domain = config?.domain;
    const sequentialDomain =
      domain !== undefined && domain.length === 2
        ? ([cellToNumber(domain[0] as CellValue), cellToNumber(domain[1] as CellValue)] as [
            number,
            number,
          ])
        : undefined;
    // Edition-keyed default ramp: identical to the trainSequential built-in
    // for edition 1 (pass nothing — keeps behavior byte-stable); a different
    // edition's ramp is passed explicitly. Explicit config always wins.
    const editionRamp =
      editionDefaults.sequentialRamp === VIRIDIS_RAMP_10
        ? undefined
        : editionDefaults.sequentialRamp;
    const range = config?.range ?? editionRamp;
    const scale = trainSequential(extent, {
      ...(sequentialDomain !== undefined && { domain: sequentialDomain }),
      ...(range !== undefined && { range }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
    });
    if (config?.scheme === undefined && config?.range === undefined) {
      advisories.push({
        code: "palette-inferred",
        path: `scales.${name}`,
        chosen: "sequential viridis ramp",
        howToOverride: `Set scales.${name}.range (ramp stops) or scales.${name}.domain.`,
      });
    }
    const labelFormat = config?.labels;
    let format = defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
    if (labelFormat !== undefined) {
      const f = numberFormatter(labelFormat);
      if (f.ok) {
        format = (v: number) => f.format(v);
      } else {
        warnings.push({
          code: "invalid-label-format",
          message: `Unrecognized labels format "${labelFormat}" on scales.${name}; using the default.`,
        });
      }
    }
    return {
      resolved: { kind: "sequential", scale },
      legendInput: {
        kind: "ramp",
        scale: name,
        title: legendTitle,
        domain: scale.domain,
        at: (t: number) => scale.at(t),
        format,
      },
      state: null,
    };
  }

  // --- ordinal (value-stable) --------------------------------------------------
  const scheme = config?.scheme;
  // Edition-keyed default palette: for edition 1 nothing is passed (trainColor
  // keeps its "observable10" scheme fingerprint — byte-stable with pre-edition
  // state); other editions pass their palette as an explicit range.
  const editionPalette =
    editionDefaults.categoricalPalette === CATEGORICAL_PALETTE_10
      ? undefined
      : editionDefaults.categoricalPalette;
  // A named scheme resolves inside trainColor. Edition defaults only apply
  // when the caller supplied neither a scheme nor an explicit range.
  const range = config?.range ?? (scheme === undefined ? editionPalette : undefined);
  let scale: ColorScale;
  try {
    scale = trainColor(values, prevState, {
      ...(config?.domain !== undefined && { domain: config.domain }),
      ...(config?.domainMode !== undefined && { domainMode: config.domainMode }),
      ...(range !== undefined && { range }),
      ...(scheme !== undefined && { scheme }),
      ...(config?.reverse !== undefined && { reverse: config.reverse }),
      ...(config?.onExhaust !== undefined && { onExhaust: config.onExhaust }),
    });
  } catch (error) {
    if (error instanceof PaletteExhaustedError) {
      throw new PipelineError("palette-exhausted", `/scales/${name}`, error.message);
    }
    throw error;
  }
  for (const w of scale.warnings) warnings.push({ code: w.code, message: w.message });
  if (config?.scheme === undefined && config?.range === undefined) {
    advisories.push({
      code: "palette-inferred",
      path: `scales.${name}`,
      chosen: "categorical 10-color palette (value-stable assignment)",
      howToOverride: `Set scales.${name}.scheme, scales.${name}.range, or scales.${name}.domain.`,
    });
  }
  return {
    resolved: { kind: "ordinal", scale },
    legendInput: {
      kind: "discrete",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      firstSeen: values,
      colorOf: (v: unknown) => scale.colorOf(v),
    },
    state: scale.state,
  };
}

// ---------------------------------------------------------------------------
// Layout + scene assembly
// ---------------------------------------------------------------------------

const TITLE_BAND = 22;
const SUBTITLE_BAND = 16;
const CAPTION_BAND = 14;
const AXIS_TITLE_BAND = 18;
const LEGEND_GAP = 12;
const LEGEND_EDGE_PAD = 2;

function layoutDomain(
  scale: PositionScale,
  breaks: readonly (number | string)[] | undefined,
): Domain {
  if (scale.type === "band") return { type: "band", categories: [...scale.domain] };
  const numericBreaks =
    breaks === undefined
      ? undefined
      : breaks.map((b) => cellToNumber(b as CellValue)).filter((v) => Number.isFinite(v));
  return {
    type: scale.type,
    min: scale.domain[0],
    max: scale.domain[1],
    ...(numericBreaks !== undefined && { breaks: numericBreaks }),
  };
}

function makeAxisFormatter(
  axis: "x" | "y",
  scale: PositionScale,
  config: PositionScaleSpec | undefined,
  warnings: PipelineWarning[],
): TickFormatter | undefined {
  const labels = config?.labels;
  if (labels === undefined) return undefined;
  if (scale.type === "band") {
    warnings.push({
      code: "invalid-label-format",
      message: `scales.${axis}.labels format strings apply to continuous scales; the band ${axis} scale ignores it.`,
    });
    return undefined;
  }
  if (scale.type === "time") {
    return (value) => formatTime(value as number, labels);
  }
  const f = numberFormatter(labels);
  if (!f.ok) {
    warnings.push({
      code: "invalid-label-format",
      message: `Unrecognized labels format "${labels}" on scales.${axis}; using the default.`,
    });
    return undefined;
  }
  return (value) => f.format(value as number);
}

function makeAxisValueFormatter(
  scale: PositionScale,
  custom: TickFormatter | undefined,
): AxisValueFormatter {
  if (scale.type === "band") return (value) => (value === null ? "–" : String(value));
  const fallback =
    scale.type === "time"
      ? defaultTimeTickFormat
      : scale.type === "log"
        ? defaultLogTickFormat
        : defaultTickFormat(tickStep(scale.domain[0], scale.domain[1], 5));
  return (value) => {
    if (value === null) return "–";
    const numeric = cellToNumber(value);
    return custom === undefined ? fallback(numeric) : custom(numeric, NaN);
  };
}

/** Project layout ticks through a scale onto an axis extent, in px. */
function axisTicks(
  scale: PositionScale,
  ticks: LayoutResult["x"]["ticks"],
  extent: number,
  fromEnd: boolean,
): SceneTick[] {
  const out: SceneTick[] = [];
  for (const tick of ticks) {
    const t =
      scale.type === "band" ? scale.normalize(tick.value) : scale.normalize(tick.value as number);
    if (t === undefined || Number.isNaN(t)) continue;
    const pos = fromEnd ? extent - t * extent : t * extent;
    out.push({ pos, label: tick.labeled ? tick.label : "" });
  }
  return out;
}

function dedupeWarnings(list: PipelineWarning[]): PipelineWarning[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const key = `${w.code} ${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeAdvisories(list: Advisory[]): Advisory[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    const key = `${a.code} ${a.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const elementwiseMaxMargins = (a: Margins, b: Margins): Margins => ({
  top: Math.max(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
  left: Math.max(a.left, b.left),
});

/**
 * Facet frames index into the PANEL table; hit-testing/tooltips need SOURCE
 * rows, so remap through the partition (NO_ROW stays NO_ROW).
 */
function remapSourceRows(frame: LayerFrame, sourceRows: number[] | null): void {
  if (sourceRows === null) return;
  for (let i = 0; i < frame.rowIndex.length; i++) {
    const local = frame.rowIndex[i]!;
    if (local !== NO_ROW) frame.rowIndex[i] = sourceRows[local]!;
  }
}

function scaleDomainSnapshot(scale: PositionScale): readonly CellValue[] {
  return Object.freeze([...scale.domain]);
}

// ---------------------------------------------------------------------------
// runPipeline
// ---------------------------------------------------------------------------

let nextRunId = 0;

export function runPipeline(spec: SpecInput | PortableSpec, options: RunOptions): RenderModel {
  const runId = ++nextRunId;
  perfMark("ggsvelte:pipeline:start");

  // normalize + validate (normalize is idempotent; validation is cheap and
  // makes every entry point honor the agent error contract)
  const normalized = normalize(spec);
  const result = validate(normalized);
  if (!result.ok) throw new SpecValidationError(result.errors);

  const warnings: PipelineWarning[] = [];
  const advisories: Advisory[] = [];

  // Defaults edition (Hadley lesson 13): the spec's stamped edition selects
  // the default theme table + palettes; explicit settings still win.
  const editionResolution = resolveEditionDefaults(normalized.edition, options.editions);
  if (editionResolution.unknownRequested !== null) {
    warnings.push({
      code: "unknown-edition",
      message:
        `The spec targets defaults edition ${editionResolution.unknownRequested}, which this ` +
        `version of ggsvelte does not know; falling back to edition ${editionResolution.edition} defaults.`,
    });
  }
  const editionDefaults = editionResolution.defaults;

  let theme: ThemeTokens;
  try {
    theme = resolveTheme(normalized.theme, editionDefaults.themes);
  } catch (error) {
    if (error instanceof UnknownThemeError) {
      throw new PipelineError("unknown-theme", "/theme", error.message);
    }
    throw error;
  }

  const flip = normalized.coord?.type === "flip";

  // bind + facet partition + per-panel frames
  perfMark("ggsvelte:bind:start");
  const table = bindData(normalized, options);
  const emptyData = table.rowCount === 0;
  if (emptyData) {
    warnings.push({
      code: "empty-data",
      message: "The data has no rows; rendering the frame and axes as a placeholder.",
    });
  }

  const facetLayout = emptyData ? SINGLE_PANEL(table) : resolveFacet(normalized.facet, table);
  const { faceted, nrow, ncol } = facetLayout;
  const facetPanels = facetLayout.panels;
  const freeX = faceted && facetLayout.freeX;
  const freeY = faceted && facetLayout.freeY;

  const bindings: LayerBinding[] = [];
  const panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  if (!emptyData) {
    for (let index = 0; index < normalized.layers.length; index++) {
      bindings.push(bindLayer(normalized.layers[index]!, index, table, warnings));
    }
    // Shared bin break grids across panels when the x scale is fixed.
    const binRanges = bindings.map((binding) => {
      const stat = binding.layer.stat ?? "identity";
      if (stat !== "bin" || !faceted || freeX || binding.xField === null) return void 0;
      return finiteExtent([table.numeric(binding.xField)]) ?? void 0;
    });
    for (let p = 0; p < facetPanels.length; p++) {
      const panelTable = facetPanels[p]!.table;
      for (let index = 0; index < bindings.length; index++) {
        const frame = buildFrame(
          bindings[index]!,
          panelTable,
          warnings,
          advisories,
          binRanges[index],
        );
        applyPosition(frame, advisories, panelTable);
        remapSourceRows(frame, facetPanels[p]!.sourceRows);
        panelFrames[p]!.push(frame);
      }
    }
    for (let index = 0; index < bindings.length; index++) {
      const allEmpty = panelFrames.every((frames) => frames[index]!.n === 0);
      if (allEmpty && bindings[index]!.ruleForm !== "annotation") {
        warnings.push({
          code: "empty-layer",
          message: `Layer ${index} (${bindings[index]!.layer.geom}) has no drawable rows after its stat; skipping it.`,
        });
      }
    }
  }
  perfMark("ggsvelte:bind:end");
  perfMeasure("ggsvelte:bind", "ggsvelte:bind:start", "ggsvelte:bind:end");

  // train scales — fixed: union across panels; free: positional domains per
  // panel; discrete color/fill assignment ALWAYS global (one legend).
  perfMark("ggsvelte:scales:start");
  const scalesConfig = normalized.scales ?? {};
  const allFrames = panelFrames.flat();
  const xInputs = collectAxisInputs("x", allFrames, scalesConfig.x?.type, advisories);
  const yInputs = collectAxisInputs("y", allFrames, scalesConfig.y?.type, advisories);
  const xTraining = trainAxis("x", xInputs, scalesConfig.x);
  const yTraining = trainAxis("y", yInputs, scalesConfig.y);
  advisories.push(...xTraining.advisories, ...yTraining.advisories);
  warnings.push(...xTraining.warnings, ...yTraining.warnings);

  // Per-panel scales for free dimensions. The scale TYPE is decided once
  // from the union evidence (panels must agree); domains train per panel.
  const panelScales: { x: PositionScale; y: PositionScale }[] = facetPanels.map((_, p) => {
    let px = xTraining.scale;
    let py = yTraining.scale;
    const scratch: Advisory[] = [];
    if (freeX) {
      const inputs = collectAxisInputs("x", panelFrames[p]!, scalesConfig.x?.type, scratch);
      const training = trainAxis("x", inputs, { ...scalesConfig.x, type: xTraining.scale.type });
      warnings.push(...training.warnings);
      px = training.scale;
    }
    if (freeY) {
      const inputs = collectAxisInputs("y", panelFrames[p]!, scalesConfig.y?.type, scratch);
      const training = trainAxis("y", inputs, { ...scalesConfig.y, type: yTraining.scale.type });
      warnings.push(...training.warnings);
      py = training.scale;
    }
    return { x: px, y: py };
  });

  const labs = normalized.labs ?? {};
  const firstColorField = allFrames.find((f) => f.binding.color.field !== null)?.binding.color
    .field;
  const firstFillField = allFrames.find((f) => f.binding.fill.field !== null)?.binding.fill.field;
  const colorResolution = resolveColorScale(
    "color",
    allFrames,
    table,
    scalesConfig.color,
    options.prevScales?.["color"] ?? null,
    labs.color ?? firstColorField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );
  const fillResolution = resolveColorScale(
    "fill",
    allFrames,
    table,
    scalesConfig.fill,
    options.prevScales?.["fill"] ?? null,
    labs.fill ?? firstFillField ?? "",
    warnings,
    advisories,
    editionDefaults,
  );
  perfMark("ggsvelte:scales:end");
  perfMeasure("ggsvelte:scales", "ggsvelte:scales:start", "ggsvelte:scales:end");

  // layout (bounded two-pass; facet grids run the per-panel mirror of it)
  perfMark("ggsvelte:layout:start");
  const title = labs.title ?? "";
  const subtitle = labs.subtitle ?? "";
  const caption = labs.caption ?? "";
  const xTitle = labs.x ?? allFrames.find((f) => f.binding.xField !== null)?.binding.xField ?? "";
  const yTitle =
    labs.y ??
    allFrames.find((f) => f.binding.yField !== null)?.binding.yField ??
    allFrames.find((f) => f.binding.yStatColumn !== null)?.binding.yStatColumn ??
    "";
  const titleBand = Math.max(TITLE_BAND, theme.titleSize + 7);
  const subtitleBand = Math.max(SUBTITLE_BAND, theme.subtitleSize + 4);
  const captionBand = Math.max(CAPTION_BAND, theme.captionSize + 5);
  const axisTitleBand = Math.max(AXIS_TITLE_BAND, theme.axisTitleSize + 9);
  const topBand = (title === "" ? 0 : titleBand) + (subtitle === "" ? 0 : subtitleBand);
  const bottomBand = caption === "" ? 0 : captionBand;

  // Display sides: under coord flip the BOTTOM axis shows the y channel and
  // the LEFT axis shows the x channel — titles, formatters, domains, and
  // free-scale behavior all follow the displayed scale.
  const hTitle = flip ? yTitle : xTitle;
  const vTitle = flip ? xTitle : yTitle;
  const formatX = makeAxisFormatter("x", xTraining.scale, scalesConfig.x, warnings);
  const formatY = makeAxisFormatter("y", yTraining.scale, scalesConfig.y, warnings);
  const formatH = flip ? formatY : formatX;
  const formatV = flip ? formatX : formatY;
  const hBreaks = flip ? scalesConfig.y?.breaks : scalesConfig.x?.breaks;
  const vBreaks = flip ? scalesConfig.x?.breaks : scalesConfig.y?.breaks;
  const freeH = flip ? freeY : freeX;
  const freeV = flip ? freeX : freeY;
  const displayScales = (p: number): { h: PositionScale; v: PositionScale } => {
    const s = panelScales[p]!;
    return flip ? { h: s.y, v: s.x } : { h: s.x, v: s.y };
  };

  const measurer = options.measureText ?? new MetricsTableMeasurer(FONT_METRICS);
  const layoutTheme = {
    ...DEFAULT_LAYOUT_THEME,
    fontSize: theme.axisTextSize,
    tickLength: theme.ticksX || theme.ticksY ? theme.tickLength : 0,
    tickLabelGap: theme.ticksX || theme.ticksY ? 3 : 5,
  };
  const legendOrder: LegendOrder = normalized.legend?.order ?? "stable-domain";
  const legendInputs = [colorResolution.legendInput, fillResolution.legendInput].filter(
    (l): l is LegendInput => l !== null,
  );
  const legendBlock = buildLegends(
    legendInputs,
    legendOrder,
    measurer,
    Math.max(48, options.width * 0.35),
  );

  const layoutHeight = Math.max(40, options.height - topBand - bottomBand);

  interface PanelPlacement {
    x: number;
    y: number;
    width: number;
    height: number;
    ticksH: LayoutResult["x"]["ticks"];
    ticksV: LayoutResult["y"]["ticks"];
    showAxisX: boolean;
    showAxisY: boolean;
  }
  const placements: PanelPlacement[] = [];

  if (faceted) {
    // --- facet grid layout -------------------------------------------------
    // Outer chrome first (axis-title bands + legend column), then per-panel
    // margins measured over every panel's domains (elementwise max keeps the
    // grid regular), then a second tick pass at the true panel size.
    const spacing = PANEL_SPACING;
    const strip = STRIP_BAND;
    const outerLeft = vTitle === "" ? 0 : axisTitleBand;
    const outerBottom = hTitle === "" ? 0 : axisTitleBand;
    const outerRight = legendBlock.width > 0 ? legendBlock.width + LEGEND_GAP + LEGEND_EDGE_PAD : 0;
    const gridW = Math.max(40, options.width - outerLeft - outerRight);
    const gridH = Math.max(40, layoutHeight - outerBottom);

    const approxW = Math.max(40, (gridW - (ncol - 1) * spacing) / ncol);
    const approxH = Math.max(40, (gridH - nrow * strip - (nrow - 1) * spacing) / nrow);
    let mMax: Margins = { top: 0, right: 0, bottom: 0, left: 0 };
    for (let p = 0; p < facetPanels.length; p++) {
      const { h, v } = displayScales(p);
      const run = layout({
        width: approxW,
        height: approxH,
        x: layoutDomain(h, hBreaks),
        y: layoutDomain(v, vBreaks),
        ...(formatH !== undefined && { formatX: formatH }),
        ...(formatV !== undefined && { formatY: formatV }),
        measurer,
        theme: layoutTheme,
      });
      mMax = elementwiseMaxMargins(mMax, run.margins);
    }

    const leftCount = freeV ? ncol : 1;
    const bottomCount = freeH ? nrow : 1;
    const panelW = Math.max(
      1,
      (gridW - leftCount * mMax.left - mMax.right - (ncol - 1) * spacing) / ncol,
    );
    const panelH = Math.max(
      1,
      (gridH - mMax.top - bottomCount * mMax.bottom - nrow * strip - (nrow - 1) * spacing) / nrow,
    );

    // Column x positions and row y positions.
    const colX: number[] = [];
    let xCursor = outerLeft;
    for (let c = 0; c < ncol; c++) {
      if (c === 0 || freeV) xCursor += mMax.left;
      colX.push(xCursor);
      xCursor += panelW + spacing;
    }
    const rowY: number[] = [];
    let yCursor = topBand + mMax.top;
    for (let r = 0; r < nrow; r++) {
      yCursor += strip;
      rowY.push(yCursor);
      yCursor += panelH;
      if (r === nrow - 1 || freeH) yCursor += mMax.bottom;
      yCursor += spacing;
    }

    // Bottom-most occupied row per column (wrap's last row may be partial):
    // with fixed scales the x axis draws there and nowhere else.
    const bottomMostRow: number[] = Array.from({ length: ncol }, () => 0);
    for (const def of facetPanels) {
      if (def.row > bottomMostRow[def.col]!) bottomMostRow[def.col] = def.row;
    }

    for (let p = 0; p < facetPanels.length; p++) {
      const def = facetPanels[p]!;
      const { h, v } = displayScales(p);
      const ticksRun: PassResult = layoutPass(
        mMax,
        {
          width: panelW + mMax.left + mMax.right,
          height: panelH + mMax.top + mMax.bottom,
          x: layoutDomain(h, hBreaks),
          y: layoutDomain(v, vBreaks),
          ...(formatH !== undefined && { formatX: formatH }),
          ...(formatV !== undefined && { formatY: formatV }),
          measurer,
        },
        layoutTheme,
      );
      placements.push({
        x: colX[def.col]!,
        y: rowY[def.row]!,
        width: panelW,
        height: panelH,
        ticksH: ticksRun.x.ticks,
        ticksV: ticksRun.y.ticks,
        showAxisX: freeH || def.row === bottomMostRow[def.col]!,
        showAxisY: freeV || def.col === 0,
      });
    }
  } else {
    const { h, v } = displayScales(0);
    const reserve: Partial<Margins> = {
      ...(hTitle !== "" && { bottom: axisTitleBand }),
      ...(vTitle !== "" && { left: axisTitleBand }),
      ...(legendBlock.width > 0 && { right: legendBlock.width + LEGEND_GAP + LEGEND_EDGE_PAD }),
    };
    const layoutResult = layout({
      width: options.width,
      height: layoutHeight,
      x: layoutDomain(h, hBreaks),
      y: layoutDomain(v, vBreaks),
      ...(formatH !== undefined && { formatX: formatH }),
      ...(formatV !== undefined && { formatY: formatV }),
      measurer,
      reserve,
      theme: layoutTheme,
    });
    const margins = layoutResult.margins;
    placements.push({
      x: margins.left,
      y: topBand + margins.top,
      width: Math.max(1, options.width - margins.left - margins.right),
      height: Math.max(1, layoutHeight - margins.top - margins.bottom),
      ticksH: layoutResult.x.ticks,
      ticksV: layoutResult.y.ticks,
      showAxisX: true,
      showAxisY: true,
    });
  }
  perfMark("ggsvelte:layout:end");
  perfMeasure("ggsvelte:layout", "ggsvelte:layout:start", "ggsvelte:layout:end");

  // geometry (panel-local px; coord flip transforms per batch).
  // LAYER-major order: layer order is paint order across the whole plot, and
  // it keeps each layer's batches contiguous so strata planning (contiguous
  // same-backend batches share a stratum) never fragments on facet panels.
  perfMark("ggsvelte:geometry:start");
  const batches: GeometryBatch[] = [];
  const panelFrame = (p: number): Frame => {
    const placement = placements[p]!;
    const scales = panelScales[p]!;
    return flip
      ? {
          innerWidth: placement.height,
          innerHeight: placement.width,
          xScale: scales.x,
          yScale: scales.y,
        }
      : {
          innerWidth: placement.width,
          innerHeight: placement.height,
          xScale: scales.x,
          yScale: scales.y,
        };
  };
  for (let index = 0; index < normalized.layers.length; index++) {
    for (let p = 0; p < facetPanels.length; p++) {
      const frame = panelFrames[p]?.[index];
      if (frame === undefined) continue;
      const placement = placements[p]!;
      const built = buildBatch(
        frame,
        panelFrame(p),
        colorResolution.resolved,
        fillResolution.resolved,
        warnings,
      );
      for (const batch of built) {
        if (flip) flipBatchInPlace(batch, placement.width, placement.height);
        batch.panelIndex = p;
        batches.push(batch);
      }
    }
  }
  perfMark("ggsvelte:geometry:end");
  perfMeasure("ggsvelte:geometry", "ggsvelte:geometry:start", "ggsvelte:geometry:end");

  // scene panels: per-panel axes/grid/strips
  const scenePanels: ScenePanel[] = placements.map((placement, p) => {
    const { h, v } = displayScales(p);
    const bottom = axisTicks(h, placement.ticksH, placement.width, false);
    const left = axisTicks(v, placement.ticksV, placement.height, true);
    return {
      id: facetPanels[p]!.id,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      strip: facetPanels[p]!.label,
      axisX: placement.showAxisX ? bottom : null,
      axisY: placement.showAxisY ? left : null,
      grid: { x: bottom.map((t) => t.pos), y: left.map((t) => t.pos) },
    };
  });

  const firstX = scenePanels.find((p) => p.axisX !== null);
  const firstY = scenePanels.find((p) => p.axisY !== null);
  const xAxis: SceneAxis = { ticks: firstX?.axisX ?? [], title: hTitle };
  const yAxis: SceneAxis = { ticks: firstY?.axisY ?? [], title: vTitle };

  // place legends: right column, top-aligned with the first panel
  const legends: SceneLegend[] = legendBlock.legends.map((legend) => ({
    ...legend,
    x: legend.x + options.width - legendBlock.width - LEGEND_EDGE_PAD,
    y: legend.y + (scenePanels[0]?.y ?? topBand),
  }));

  const scene: Scene = {
    width: options.width,
    height: options.height,
    panels: scenePanels,
    batches,
    axes: { x: xAxis, y: yAxis },
    grid: scenePanels[0]?.grid ?? { x: [], y: [] },
    legends,
    theme,
    title,
    subtitle,
    caption,
  };

  // Resolve per-layer rendering backends (advisory when 'auto' switches).
  const threshold = options.canvasThreshold ?? CANVAS_AUTO_THRESHOLD;
  const marksPerLayer: number[] = normalized.layers.map(() => 0);
  for (const batch of batches) {
    marksPerLayer[batch.layerIndex] =
      (marksPerLayer[batch.layerIndex] ?? 0) + batchMarkCount(batch);
  }
  const layerBackends: LayerBackend[] = normalized.layers.map((layer, index) => {
    if (normalized.a11y === "force-svg") return "svg";
    const hint = ("render" in layer ? layer.render : undefined) ?? "auto";
    if (hint === "svg" || hint === "canvas") return hint;
    if ((marksPerLayer[index] ?? 0) > threshold) {
      advisories.push({
        code: "canvas-auto",
        path: `layers.${index}`,
        chosen: `canvas backend (${marksPerLayer[index]} marks > threshold ${threshold}; canvas marks do not expose per-mark accessibility or "copy SVG")`,
        howToOverride: `Set layers[${index}].render to "svg" (or "canvas" to silence this), or set a11y: "force-svg" on the plot.`,
      });
      return "canvas";
    }
    return "svg";
  });

  // Tooltip contract: field-mapped channels per layer + source-row lookup.
  const layerFields: MappedField[][] = normalized.layers.map((_layer, index) => {
    const binding = bindings[index];
    if (binding === undefined) return [];
    const fields: MappedField[] = [];
    const push = (channel: string, field: string | null, source?: "stat") => {
      if (field !== null)
        fields.push(source === undefined ? { channel, field } : { channel, field, source });
    };
    const stat = binding.layer.stat ?? "identity";
    if (stat === "identity") {
      push("x", binding.xField);
      push("y", binding.yField);
    } else {
      // Synthesized stat rows have no source row. Advertise only semantic
      // generated channels that CandidateFacts can resolve truthfully.
      if (binding.xField !== null) push("x", "x", "stat");
      if (stat === "count" || stat === "bin" || stat === "density") {
        push("y", binding.yStatColumn ?? (stat === "density" ? "density" : "count"), "stat");
      } else if (stat === "boxplot") {
        push("y", "middle", "stat");
      } else if (stat === "smooth" || stat === "summary") {
        push("y", "y", "stat");
      }
    }
    push("ymin", binding.yminField);
    push("ymax", binding.ymaxField);
    push("color", binding.color.field);
    push("fill", binding.fill.field);
    push("label", binding.labelField);
    push("weight", binding.weightField);
    return fields;
  });

  // Legend-focus contract: scaled constant channels with no field mapping.
  const layerScaledConstants: ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>> =
    Object.freeze(
      normalized.layers.map((_layer, index) => {
        const binding = bindings[index];
        if (binding === undefined) return Object.freeze({});
        const out: Partial<Record<string, CellValue>> = {};
        if (binding.color.scaledConstant !== null) out["color"] = binding.color.scaledConstant;
        if (binding.fill.scaledConstant !== null) out["fill"] = binding.fill.scaledConstant;
        return Object.freeze(out);
      }),
    );

  const state: Record<string, ScaleState> = {};
  if (colorResolution.state !== null) state["color"] = colorResolution.state;
  if (fillResolution.state !== null) state["fill"] = fillResolution.state;

  const effectiveDomains: ScaleDomainSnapshot = Object.freeze({
    x: scaleDomainSnapshot(xTraining.scale),
    y: scaleDomainSnapshot(yTraining.scale),
    panels: Object.freeze(
      panelScales.map((panel) =>
        Object.freeze({ x: scaleDomainSnapshot(panel.x), y: scaleDomainSnapshot(panel.y) }),
      ),
    ),
  });
  let baselineDomains = options.baselineDomains;
  if (baselineDomains === undefined && options.baselineScales !== undefined) {
    const baselineX = trainAxis("x", xInputs, options.baselineScales.x).scale;
    const baselineY = trainAxis("y", yInputs, options.baselineScales.y).scale;
    const baselinePanels = facetPanels.map((_, panelIndex) => {
      let x = baselineX;
      let y = baselineY;
      const scratch: Advisory[] = [];
      if (freeX) {
        const inputs = collectAxisInputs(
          "x",
          panelFrames[panelIndex]!,
          options.baselineScales?.x?.type,
          scratch,
        );
        x = trainAxis("x", inputs, {
          ...options.baselineScales?.x,
          type: baselineX.type,
        }).scale;
      }
      if (freeY) {
        const inputs = collectAxisInputs(
          "y",
          panelFrames[panelIndex]!,
          options.baselineScales?.y?.type,
          scratch,
        );
        y = trainAxis("y", inputs, {
          ...options.baselineScales?.y,
          type: baselineY.type,
        }).scale;
      }
      return Object.freeze({ x: scaleDomainSnapshot(x), y: scaleDomainSnapshot(y) });
    });
    baselineDomains = Object.freeze({
      x: scaleDomainSnapshot(baselineX),
      y: scaleDomainSnapshot(baselineY),
      panels: Object.freeze(baselinePanels),
    });
  }
  baselineDomains ??= effectiveDomains;

  const lineage = new LineageStore<number>();
  let identityIndex: Readonly<{
    seriesByRow: Map<string, number>;
    sourceRowsByGroup: Map<string, number[]>;
    frameGroups: Map<string, number[]>;
  }> | null = null;
  const getIdentityIndex = () => {
    if (identityIndex !== null) return identityIndex;
    const seriesByRow = new Map<string, number>();
    const sourceRowsByGroup = new Map<string, number[]>();
    const frameGroups = new Map<string, number[]>();
    for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
      for (const frame of panelFrames[panelIndex] ?? []) {
        const frameKey = `${panelIndex}:${frame.binding.index}`;
        frameGroups.set(frameKey, [...new Set(frame.groups)]);
        const inputGroups = deriveLayerGroups(frame.binding, frame.table);
        for (let localRow = 0; localRow < inputGroups.length; localRow++) {
          const group = inputGroups[localRow]!;
          const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
          const key = `${frameKey}:${group}`;
          const members = sourceRowsByGroup.get(key);
          if (members === undefined) sourceRowsByGroup.set(key, [sourceRow]);
          else members.push(sourceRow);
        }
        for (let i = 0; i < frame.rowIndex.length; i++) {
          const sourceRow = frame.rowIndex[i]!;
          if (sourceRow !== NO_ROW) {
            seriesByRow.set(
              `${panelIndex}:${frame.binding.index}:${sourceRow}`,
              frame.groups[i] ?? 0,
            );
          }
        }
      }
    }
    identityIndex = { seriesByRow, sourceRowsByGroup, frameGroups };
    return identityIndex;
  };
  const allSourceBacked = bindings.every(
    (binding) =>
      (binding.layer.stat ?? "identity") === "identity" && binding.ruleForm !== "annotation",
  );
  const candidates = allSourceBacked
    ? buildCandidateStore(scene, {
        epoch: runId,
        flip,
        datum: createRawCandidateDatumResolver(
          bindings,
          table,
          colorResolution.resolved,
          fillResolution.resolved,
          lineage,
        ),
      })
    : buildCandidateStore(scene, {
        epoch: runId,
        flip,
        datum(facts) {
          const { seriesByRow, sourceRowsByGroup, frameGroups } = getIdentityIndex();
          const fields = layerFields[facts.layerIndex] ?? [];
          const sourceRow = facts.rowIndex;
          const frame = panelFrames[facts.panelIndex]?.[facts.layerIndex];
          const batch = scene.batches[facts.batchIndex]!;
          const outlierLocalRow =
            frame?.box !== null &&
            frame?.binding.layer.geom === "boxplot" &&
            batch.kind === "points"
              ? (frame?.box.outlierRow[facts.primitiveIndex] ?? null)
              : null;
          const outlierSourceRow =
            outlierLocalRow === null
              ? null
              : (facetPanels[facts.panelIndex]?.sourceRows?.[outlierLocalRow] ?? outlierLocalRow);
          const orderedGroups = frameGroups.get(`${facts.panelIndex}:${facts.layerIndex}`) ?? [0];
          let frameRow = Math.min(facts.primitiveIndex, Math.max(0, (frame?.n ?? 1) - 1));
          let derivedGroup = frame?.groups[frameRow] ?? 0;
          if (frame !== undefined && batch.kind === "paths") {
            let subpath = 0;
            while (
              subpath + 1 < batch.pathOffsets.length &&
              facts.primitiveIndex >= batch.pathOffsets[subpath + 1]!
            )
              subpath++;
            derivedGroup = orderedGroups[Math.min(subpath, orderedGroups.length - 1)] ?? 0;
            const rowsInGroup = frame.groups
              .map((group, row) => ({ group, row }))
              .filter((entry) => entry.group === derivedGroup)
              .map((entry) => entry.row)
              .toSorted((a, b) => (frame.xNumeric?.[a] ?? a) - (frame.xNumeric?.[b] ?? b));
            const local = facts.primitiveIndex - (batch.pathOffsets[subpath] ?? 0);
            const reflected =
              local < rowsInGroup.length ? local : Math.max(0, rowsInGroup.length * 2 - 1 - local);
            frameRow = rowsInGroup[Math.min(reflected, rowsInGroup.length - 1)] ?? frameRow;
          } else if (frame !== undefined && batch.kind === "segments") {
            if (frame.binding.layer.geom === "errorbar")
              frameRow = Math.floor(facts.primitiveIndex / 3);
            else if (frame.binding.layer.geom === "boxplot" && batch.rowIndex.length >= frame.n * 2)
              frameRow = Math.floor(facts.primitiveIndex / 2);
            derivedGroup =
              frame.groups[Math.min(frameRow, frame.groups.length - 1)] ?? derivedGroup;
          } else if (
            frame?.box !== null &&
            frame?.binding.layer.geom === "boxplot" &&
            batch.kind === "points"
          ) {
            frameRow = frame.box.outlierBox[facts.primitiveIndex] ?? frameRow;
            derivedGroup = frame.groups[frameRow] ?? derivedGroup;
          }
          const sourceValue = (field: string | undefined): CellValue =>
            sourceRow === null || field === undefined ? null : table.column(field)[sourceRow]!;
          const xField = fields.find((field) => field.channel === "x")?.field;
          const yField = fields.find((field) => field.channel === "y")?.field;
          const colorField = fields.find((field) => field.channel === "color")?.field;
          const fillField = fields.find((field) => field.channel === "fill")?.field;
          const group =
            sourceRow === null
              ? derivedGroup
              : (seriesByRow.get(`${facts.panelIndex}:${facts.layerIndex}:${sourceRow}`) ?? 0);
          const ordinalRank = (resolved: ResolvedColorScale | null, field: string | undefined) => {
            if (resolved?.kind !== "ordinal" || field === undefined || sourceRow === null)
              return -1;
            const key = bandKey(sourceValue(field));
            return resolved.scale.domain.findIndex((value) => bandKey(value) === key);
          };
          const colorRank = ordinalRank(colorResolution.resolved, colorField);
          const fillRank = ordinalRank(fillResolution.resolved, fillField);
          const autoMode = candidateAutoMode(
            frame?.binding ?? bindings[facts.layerIndex]!,
            facts.primitiveIndex,
          );
          const annotationRule = frame?.binding.ruleForm === "annotation";
          const annotationX = annotationRule
            ? (frame.xIntercepts[facts.primitiveIndex] ?? null)
            : null;
          const annotationY = annotationRule
            ? (frame.yIntercepts[facts.primitiveIndex - frame.xIntercepts.length] ?? null)
            : null;
          let representedRows =
            outlierSourceRow === null
              ? (sourceRowsByGroup.get(`${facts.panelIndex}:${facts.layerIndex}:${group}`) ?? [])
              : [outlierSourceRow];
          if (sourceRow === null && frame !== undefined) {
            const stat = frame.binding.layer.stat ?? "identity";
            const aggregateXField = frame.binding.xField;
            const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
            if (
              aggregateXField !== null &&
              outputX !== null &&
              (stat === "count" || stat === "summary" || stat === "boxplot")
            ) {
              const outputKey = bandKey(outputX);
              representedRows = representedRows.filter(
                (row) => bandKey(table.column(aggregateXField)[row]) === outputKey,
              );
            } else if (
              stat === "bin" &&
              aggregateXField !== null &&
              frame.xmin !== null &&
              frame.xmax !== null
            ) {
              const hi = frame.xmax[frameRow]!;
              const lo = frame.xmin[frameRow]!;
              const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
              const frameGroup = frame.groups[frameRow];
              const firstInGroup = frameRow === 0 || frame.groups[frameRow - 1] !== frameGroup;
              const lastInGroup =
                frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== frameGroup;
              representedRows = representedRows.filter((row) => {
                const value = cellToNumber(table.column(aggregateXField)[row]!);
                if (!Number.isFinite(value)) return false;
                return closed === "right"
                  ? value <= hi && (value > lo || (firstInGroup && value >= lo))
                  : value >= lo && (value < hi || (lastInGroup && value <= hi));
              });
            }
            const aggregateYField = frame.binding.yField;
            if (
              (stat === "smooth" || stat === "summary" || stat === "boxplot") &&
              aggregateYField !== null
            ) {
              representedRows = representedRows.filter((row) =>
                Number.isFinite(cellToNumber(table.column(aggregateYField)[row]!)),
              );
            }
          }
          return {
            xValue: annotationRule
              ? annotationX
              : outlierSourceRow === null
                ? sourceRow === null
                  ? (frame?.xValues?.[frameRow] ?? frame?.xNumeric?.[frameRow] ?? null)
                  : sourceValue(xField)
                : (frame?.box?.outlierX[facts.primitiveIndex] ?? null),
            yValue: annotationRule
              ? annotationY
              : outlierSourceRow === null
                ? sourceRow === null
                  ? (frame?.yNumeric?.[frameRow] ?? frame?.box?.middle[frameRow] ?? null)
                  : sourceValue(yField)
                : (frame?.box?.outlierY[facts.primitiveIndex] ?? null),
            seriesId: group,
            seriesRank: colorRank >= 0 ? colorRank : fillRank >= 0 ? fillRank : group,
            sourceOrder: sourceRow ?? outlierSourceRow ?? facts.primitiveIndex,
            lineage:
              sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
            autoMode,
          };
        },
      });

  perfMark("ggsvelte:pipeline:end");
  perfMeasure("ggsvelte:pipeline", "ggsvelte:pipeline:start", "ggsvelte:pipeline:end");

  let disposed = false;
  let retainedTable: ColumnTable | null = table;
  return {
    scene,
    scales: {
      x: xTraining.scale,
      y: yTraining.scale,
      color: colorResolution.resolved,
      fill: fillResolution.resolved,
      panels: panelScales,
      state,
    },
    warnings: dedupeWarnings(warnings),
    advisories: dedupeAdvisories(advisories),
    runId,
    layerBackends,
    layerFields,
    layerScaledConstants,
    domains: Object.freeze({ baseline: baselineDomains, effective: effectiveDomains }),
    lineage,
    candidates,
    axisFormatters: Object.freeze({
      x: makeAxisValueFormatter(xTraining.scale, formatX),
      y: makeAxisValueFormatter(yTraining.scale, formatY),
    }),
    row(index: number): Record<string, CellValue> | null {
      const source = retainedTable;
      if (source === null || index === NO_ROW || index < 0 || index >= source.rowCount) return null;
      const out: Record<string, CellValue> = {};
      for (const field of source.fields) out[field] = source.column(field)[index]!;
      return out;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      candidates.dispose();
      retainedTable = null;
      // Release geometry (typed arrays) and per-panel structures; the bound
      // table and its numeric caches become unreachable with this model.
      scene.batches.length = 0;
      scene.panels.length = 0;
      scene.legends.length = 0;
    },
  };
}
