/**
 * Layer-frame construction: run per-panel stats to produce LayerFrames,
 * remap facet-local rows to source indices, and resolve candidate-store
 * datum factories from bound layers.
 */
import type { BarParams, BoxplotParams, ErrorbarParams, SmoothParams } from "@ggsvelte/spec";

import { deriveGroups } from "../grouping.js";
import { bandKey } from "../scales/train.js";
import { statBin } from "../stats/bin.js";
import { statBoxplot } from "../stats/boxplot.js";
import { statCount } from "../stats/count.js";
import { statDensity } from "../stats/density.js";
import { statSmooth } from "../stats/smooth.js";
import { statSummary } from "../stats/summary.js";
import type { CellValue, Discreteness } from "../table.js";
import { cellsToNumeric, ColumnTable } from "../table.js";
import type {
  CandidateBuildFacts,
  CandidateDatum,
  ResolvedCandidateInspectMode,
} from "../candidate-store.js";
import { LineageStore } from "../identity.js";

import type {
  Advisory,
  LayerBinding,
  LayerFrame,
  PipelineWarning,
  ResolvedColorScale,
} from "./types.js";
import { NO_ROW } from "./types.js";

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

export function deriveLayerGroups(binding: LayerBinding, table: ColumnTable): number[] {
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

export function createRawCandidateDatumResolver(
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

export function candidateAutoMode(
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

export function buildFrame(
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

/**
 * Facet frames index into the PANEL table; hit-testing/tooltips need SOURCE
 * rows, so remap through the partition (NO_ROW stays NO_ROW).
 */
export function remapSourceRows(frame: LayerFrame, sourceRows: number[] | null): void {
  if (sourceRows === null) return;
  for (let i = 0; i < frame.rowIndex.length; i++) {
    const local = frame.rowIndex[i]!;
    if (local !== NO_ROW) frame.rowIndex[i] = sourceRows[local]!;
  }
}
