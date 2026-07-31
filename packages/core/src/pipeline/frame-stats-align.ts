/**
 * Align stat → LayerFrame (shared x grid + interpolated y per group), plus
 * the default-stack auto-align rescue for sparse stacked areas (#1268).
 */
import type { ColumnTable } from "../table.js";

import { statAlign } from "../stats/align.js";
import { carriedColumns, removedStatWarning } from "./frame-helpers.js";
import { makeColumnOf } from "./frame-stats-shared.js";
import { statLayerFrame } from "./layer-frame.js";
import { positionColumn, positionFieldType, xConversionOf } from "./temporal-position.js";
import { NO_ROW } from "./types.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildAlignFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const { index } = binding;
  const carried = carriedColumns(binding, table);
  const columnOf = makeColumnOf(binding);
  const result = statAlign({
    x: positionColumn(table, binding.xField!, binding.xConversion, binding.xTransform),
    y: positionColumn(table, binding.yField!, binding.yConversion, binding.yTransform),
    groups,
    carried,
  });
  removedStatWarning(result.dropped, index, "missing or non-finite x/y before align", warnings);
  // Grid points that coincide with a group's own observed sample keep that
  // row's lineage, so hover/tooltip/keyboard inspection still reach real data
  // on aligned frames; only interpolated/zero-extended cells are synthetic.
  const lineage = Uint32Array.from(result.sourceRows, (row) => (row < 0 ? NO_ROW : row));
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
    lineage,
  });
}

/**
 * Default stacked-area rescue (#1268): when a group's x samples leave an
 * interior hole in the shared grid, the identity path would chord straight
 * across it and render a floating polygon over the varying stack below.
 * Auto-apply the align stat instead — the documented remedy for stacking
 * groups with different continuous x samples (ggplot2 stat_align semantics:
 * interpolate between a group's observed samples, zero outside its range) —
 * and disclose the heuristic. Exterior-only incompleteness, non-overlapping
 * ranges, single groups, unstacked positions, and groups with repeated x
 * values (identity stacking sums those; align would drop them) fall through
 * to identity. Row expansion is O(groups × union-x).
 */
export function maybeStackAlignFrame(
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
  const need = needsStackAlign(x, y, groups);
  if (need === null) return null;
  const expanded = need.groupCount * need.gridSize;
  if (expanded > Math.max(STACK_ALIGN_MAX_ROWS, STACK_ALIGN_MAX_GROWTH * need.finiteRows)) {
    // Align materializes groups × union-x rows; on very sparse high-n data
    // that can dwarf the input. Keep raw geometry and say so loudly.
    warnings.push({
      code: "stack-align-skipped",
      message: `Layer ${index}: stacked area groups sample different x values, but auto-align would expand ${need.finiteRows} rows to ${expanded} (groups × shared-grid x) — bands with interior gaps may render as floating polygons. Pre-fill or aggregate the data, or set stat: "align" to force the expansion.`,
    });
    return null;
  }

  const frame = buildAlignFrame(binding, table, groups, warnings);
  advisories.push({
    code: "stack-align-applied",
    path: `layers.${index}`,
    chosen:
      "groups aligned onto the shared x grid — interpolated between a group's observed samples, zero outside its range (groups sampled different x; a raw stack would render floating bands; faceted panels gate independently, matching panel-local stats)",
    howToOverride: `Pre-fill the missing group×x cells in the data to control values exactly, or set position: "identity" on layer ${index} for overlapping unstacked areas. stat: "align" is this same transform, explicit.`,
  });
  return frame;
}

/**
 * Plot-level risk that the shared x scale trains as band/binned, mirroring
 * `collectMappedXEvidence`: an explicit discrete x type, any bar/col layer
 * with a non-bin stat (bar discretization), or any nominal x field. When any
 * layer carries the risk, the auto-align rescue must not rewrite frames — a
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

/** Absolute expanded-row budget for the auto rescue (explicit stat align has no cap). */
export const STACK_ALIGN_MAX_ROWS = 20_000;
/** Relative expanded-row budget: multiple of the layer's finite input rows. */
export const STACK_ALIGN_MAX_GROWTH = 10;

/**
 * Non-null when the rescue should fire: ≥2 groups have finite rows, no group
 * repeats a finite x (identity stacking sums repeats; align's last-wins
 * collapse would silently shrink the stacked total), and some group's finite
 * x set skips a shared-grid x strictly inside that group's own [min, max] —
 * the shape that chords across the stack. Returns the expansion inputs so the
 * caller can budget groups × union-x before rewriting the frame.
 */
function needsStackAlign(
  x: Float64Array,
  y: Float64Array,
  groups: readonly number[],
): { groupCount: number; gridSize: number; finiteRows: number } | null {
  const perGroup = new Map<number, Set<number>>();
  const grid = new Set<number>();
  let finiteRows = 0;
  for (let row = 0; row < x.length; row++) {
    const xv = x[row]!;
    if (!Number.isFinite(xv) || !Number.isFinite(y[row]!)) continue;
    finiteRows++;
    grid.add(xv);
    const g = groups[row] ?? 0;
    let set = perGroup.get(g);
    if (set === undefined) {
      set = new Set();
      perGroup.set(g, set);
    }
    if (set.has(xv)) return null;
    set.add(xv);
  }
  if (perGroup.size < 2) return null;
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
      if (!set.has(xv)) {
        return { groupCount: perGroup.size, gridSize: gridSorted.length, finiteRows };
      }
    }
  }
  return null;
}
