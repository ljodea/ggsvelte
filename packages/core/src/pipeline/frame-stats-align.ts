/**
 * Shared-x-grid stats → LayerFrame: the align stat (interpolated y per group)
 * and the default-stack zero-fill rescue for sparse stacked areas (#1268).
 */
import type { ColumnTable } from "../table.js";

import { statAlign, statZeroFill, type StatAlignResult } from "../stats/align.js";
import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn, positionFieldType, xConversionOf } from "./temporal-position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildAlignFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  return buildSharedGridFrame(binding, table, groups, warnings, statAlign, "align");
}

/**
 * Default stacked-area rescue (#1268): when a group's x samples leave an
 * interior hole in the shared grid, the identity path would chord straight
 * across it and render a floating polygon over the varying stack below.
 * Zero-fill missing group×x cells instead (absence = zero, no interpolation)
 * and disclose the heuristic. Exterior-only incompleteness, non-overlapping
 * ranges, single groups, and unstacked positions fall through to identity.
 * Row expansion is O(groups × union-x).
 */
export function maybeStackZeroFillFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  advisories: Advisory[],
  xDiscreteRisk: boolean,
): LayerFrame | null {
  const { layer, index } = binding;
  // A band-trained x cannot consume the numeric-only shared-grid frame (rows
  // would drop as unmappable), so any discretization risk skips the rescue.
  if (xDiscreteRisk) return null;
  if (layer.geom !== "area") return null;
  if ((layer.stat ?? "identity") !== "identity") return null;
  const position = layer.position ?? "identity";
  if (position !== "stack" && position !== "fill") return null;
  if (binding.xField === null || binding.yField === null) return null;

  const x = positionColumn(table, binding.xField, binding.xConversion, binding.xTransform);
  const y = positionColumn(table, binding.yField, binding.yConversion, binding.yTransform);
  if (!hasInteriorHole(x, y, groups)) return null;

  const frame = buildSharedGridFrame(binding, table, groups, warnings, statZeroFill, "zero-fill");
  advisories.push({
    code: "stack-zero-filled",
    path: `layers.${index}`,
    chosen:
      "missing group×x cells zero-filled onto the shared x grid (groups sampled different x; the gap would render as a floating band)",
    howToOverride: `Set stat: "align" on layer ${index} to interpolate between a group's observed samples instead, pre-fill the missing cells in the data, or set position: "identity" for overlapping unstacked areas.`,
  });
  return frame;
}

/**
 * Plot-level risk that the shared x scale trains as band/binned, mirroring
 * `collectMappedXEvidence`: an explicit discrete x type, any bar/col layer
 * with a non-bin stat (bar discretization), or any nominal x field. When any
 * layer carries the risk, the zero-fill rescue must not rewrite frames — a
 * band scale cannot map the numeric-only shared-grid rows. Conservative by
 * design: a false positive only keeps today's identity behavior.
 */
export function xDiscreteRiskOf(
  bindings: readonly LayerBinding[],
  tables: readonly ColumnTable[],
  xType: string | undefined,
): boolean {
  if (xType === "band" || xType === "binned") return true;
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i]!;
    const geom = binding.layer.geom;
    if ((geom === "bar" || geom === "col") && binding.layer.stat !== "bin") return true;
    const field = binding.xField;
    const table = tables[i];
    if (field === null || table === undefined || !table.has(field)) continue;
    if (positionFieldType(table, field, xConversionOf(binding)) === "nominal") return true;
  }
  return false;
}

/**
 * True when ≥2 groups have finite rows and some group's finite x set skips a
 * shared-grid x strictly inside that group's own [min, max] — the shape that
 * chords across the stack.
 */
function hasInteriorHole(x: Float64Array, y: Float64Array, groups: readonly number[]): boolean {
  const perGroup = new Map<number, Set<number>>();
  const grid = new Set<number>();
  for (let row = 0; row < x.length; row++) {
    const xv = x[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(y[row]!)) continue;
    grid.add(xv);
    const g = groups[row] ?? 0;
    let set = perGroup.get(g);
    if (set === undefined) {
      set = new Set();
      perGroup.set(g, set);
    }
    set.add(xv);
  }
  if (perGroup.size < 2) return false;
  const gridSorted = [...grid].toSorted((a, b) => a - b);
  for (const set of perGroup.values()) {
    if (set.size === gridSorted.length) continue;
    let min = Infinity;
    let max = -Infinity;
    for (const v of set) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    for (const xv of gridSorted) {
      if (xv <= min) continue;
      if (xv >= max) break;
      if (!set.has(xv)) return true;
    }
  }
  return false;
}

function buildSharedGridFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
  stat: (input: Parameters<typeof statAlign>[0]) => StatAlignResult,
  label: string,
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = stat({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
  });
  removedStatWarning(result.dropped, index, `missing or non-finite x/y before ${label}`, warnings);
  return statLayerFrame({
    binding,
    table,
    n: result.x.length,
    x: { numeric: result.x },
    y: { numeric: result.y },
    groups: result.groups,
    inputGroups: groups,
    columns: { x: result.x, y: result.y },
    columnOf: columnOf(result, null),
    lineage: "none",
  });
}
