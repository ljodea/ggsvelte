/**
 * Group-bucket and x-sort helpers for path/line geometry builders.
 */
import type { LayerFrame, PipelineWarning } from "./types.js";
import type { Frame } from "./geometry-shared-position.js";
import { positionOf, removedWarning } from "./geometry-shared-position.js";

type ContinuousPositionScale = Exclude<Frame["xScale"], { type: "band" }>;

function bucketContinuousRows(
  frame: LayerFrame,
  groupRows: number[][],
  xNum: Float64Array,
  yNum: Float64Array,
  xScale: ContinuousPositionScale,
  yScale: ContinuousPositionScale,
): number {
  let removed = 0;
  for (let row = 0; row < frame.n; row++) {
    const xv = xNum[row];
    const yv = yNum[row];
    if (xv === undefined || yv === undefined || !Number.isFinite(xv) || !Number.isFinite(yv)) {
      removed++;
      continue;
    }
    const tx = xScale.normalizeTransformed(xv);
    const ty = yScale.normalizeTransformed(yv);
    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      removed++;
      continue;
    }
    const group = frame.groups[row]!;
    (groupRows[group] ??= []).push(row);
  }
  return removed;
}

function bucketGeneralRows(
  frame: LayerFrame,
  fx: Frame,
  groupRows: number[][],
  yNumericOverride: Float64Array | null,
): number {
  let removed = 0;
  for (let row = 0; row < frame.n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const ty = positionOf(
      fx.yScale,
      yNumericOverride ?? frame.yNumeric,
      yNumericOverride instanceof Float64Array ? null : frame.yValues,
      row,
    );
    if (Number.isNaN(tx) || Number.isNaN(ty)) {
      removed++;
      continue;
    }
    const group = frame.groups[row]!;
    (groupRows[group] ??= []).push(row);
  }
  return removed;
}

export function bucketByGroup(
  frame: LayerFrame,
  fx: Frame,
  yNumericOverride: Float64Array | null,
  warnings: PipelineWarning[],
): number[][] {
  const groupRows: number[][] = [];
  // Continuous × continuous: monomorphic numeric + normalizeTransformed finite
  // filter (no band / column normalize branch). Still call normalizeTransformed
  // so projected panel scales (coord log/sqrt/etc.) that map out-of-range
  // fractions to NaN are dropped with removed-missing — same as positionOf.
  // Do not short-circuit on type/transform alone: projectors wrap linear
  // identity scales and override normalizeTransformed.
  let removed: number;
  if (
    fx.xScale.type !== "band" &&
    fx.yScale.type !== "band" &&
    frame.xNumeric !== null &&
    (yNumericOverride !== null || frame.yNumeric !== null)
  ) {
    removed = bucketContinuousRows(
      frame,
      groupRows,
      frame.xNumeric,
      yNumericOverride ?? frame.yNumeric!,
      fx.xScale,
      fx.yScale,
    );
  } else {
    removed = bucketGeneralRows(frame, fx, groupRows, yNumericOverride);
  }
  removedWarning(removed, frame.binding.index, warnings);
  return groupRows.filter((rows) => rows !== undefined && rows.length > 0);
}

/**
 * ggplot2's geom_path parity warning, extended to area (#1271): when ≥2
 * drawable groups exist and EVERY group holds exactly one observation, each
 * connected stroke or ribbon degenerates to a point-width mark — usually a
 * discrete x joining the default grouping interaction (decision 0005).
 * Message is layer-stable (no per-panel counts) so facets dedupe to one.
 */
export function warnSingleObservationGroups(
  groupRows: readonly number[][],
  frame: LayerFrame,
  warnings: PipelineWarning[],
): void {
  // ≥2 groups: a legitimately single-point layer (one 1-row group) stays
  // silent — unlike ggplot2, which also warns there; that case is usually
  // intentional data, not a grouping accident.
  if (groupRows.length < 2) return;
  if (!groupRows.every((rows) => rows.length === 1)) return;
  warnings.push({
    code: "group-single-observation",
    message: `Layer ${frame.binding.index}: each group consists of only one observation, so every connected mark degenerates — often a discrete x or an all-distinct series aesthetic joining the default grouping. Map aes.group (the series field, or a constant for one series) to join rows into ribbons/strokes.`,
  });
}

/**
 * Sort each group's row indices by ascending x (path/line/area/smooth).
 *
 * Callers pass groups already filtered by {@link bucketByGroup} (finite x/y).
 * Band x: materialize domain ranks once — O(R) `indexOf`/encodeKey lookups —
 * then O(1) comparator reads (not O(R log R) key re-evals during sort).
 * Continuous x: compare `frame.xNumeric` directly (no key array).
 */
export function sortGroupRowsByX(
  groupRows: readonly number[][],
  frame: LayerFrame,
  fx: Frame,
): void {
  if (fx.xScale.type === "band") {
    const keys = new Float64Array(frame.n);
    const xValues = frame.xValues;
    for (let row = 0; row < frame.n; row++) {
      keys[row] = fx.xScale.indexOf(xValues?.[row] ?? null) ?? Number.MAX_SAFE_INTEGER;
    }
    for (const rows of groupRows) {
      if (isNonDecreasing(rows, keys)) continue;
      // Band ranks are always finite (unknown → MAX_SAFE_INTEGER).
      rows.sort((a, b) => keys[a]! - keys[b]!);
    }
    return;
  }
  const x = frame.xNumeric!;
  for (const rows of groupRows) {
    // Multi-series long form is usually already x-sorted within each group
    // after bucketByGroup's ascending row walk — O(n) check beats O(n log n).
    if (isNonDecreasing(rows, x)) continue;
    // Ribbon calls this *before* its finite filter and uses non-finite slots
    // to split runs (ggplot2 NA gaps). Sort only finite-keyed rows in place so
    // NaN/missing positions stay put and still break the band.
    sortFiniteSlotsInPlace(rows, x);
  }
}

function isNonDecreasing(rows: readonly number[], keys: ArrayLike<number>): boolean {
  for (let i = 1; i < rows.length; i++) {
    // NaN keys (ribbon sorts before its finite filter) are never "ordered":
    // every comparison involving NaN is false, so `a < b` would skip sort.
    if (!(keys[rows[i]!]! >= keys[rows[i - 1]!]!)) return false;
  }
  return true;
}

/**
 * Ascending sort of finite-keyed row indices only; leave non-finite slots in
 * their original positions so ribbon gap splitting still sees them mid-group.
 * Exported for y-oriented ribbon running-coord sorts.
 */
export function sortFiniteSlotsInPlace(rows: number[], keys: ArrayLike<number>): void {
  const slots: number[] = [];
  const finiteRows: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (Number.isFinite(keys[row]!)) {
      slots.push(i);
      finiteRows.push(row);
    }
  }
  if (finiteRows.length < 2) return;
  finiteRows.sort((a, b) => keys[a]! - keys[b]!);
  for (let j = 0; j < slots.length; j++) {
    rows[slots[j]!] = finiteRows[j]!;
  }
}
