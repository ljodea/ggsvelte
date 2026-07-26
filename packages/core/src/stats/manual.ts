/**
 * The manual stat (ggplot2's stat_manual; #814 portable v1).
 *
 * Closed named-transform registry only — no JS callbacks in PortableSpec.
 *
 * Registry:
 *  - first | last — keep one source row per aesthetic group (real rowIndex)
 *  - mean | median | min | max | sum — one synthetic row per group; aggregate
 *    x and y independently over finite values (shared applySummaryFun math)
 *
 * Discrete aesthetics: first-wins within the group (handled by frame packing).
 * Missing / unknown fun: callers must reject before calling (fail loud).
 */
import { applySummaryFun } from "./summary.js";

const MANUAL_KEEP_FUNS = ["first", "last"] as const;
const MANUAL_AGG_FUNS = ["mean", "median", "min", "max", "sum"] as const;
const MANUAL_FUNS = [...MANUAL_KEEP_FUNS, ...MANUAL_AGG_FUNS] as const;

type ManualKeepFun = (typeof MANUAL_KEEP_FUNS)[number];
type ManualAggFun = (typeof MANUAL_AGG_FUNS)[number];
export type ManualFunName = (typeof MANUAL_FUNS)[number];

export function isManualFun(value: unknown): value is ManualFunName {
  return typeof value === "string" && (MANUAL_FUNS as readonly string[]).includes(value);
}

export function isManualKeepFun(fun: ManualFunName): fun is ManualKeepFun {
  return fun === "first" || fun === "last";
}

export interface ManualStatInput {
  /** Group id per input row (first-seen order defines emit order). */
  groups: readonly number[];
  /** Numeric x (NaN = missing). */
  x: Float64Array;
  /** Numeric y (NaN = missing). */
  y: Float64Array;
  fun: ManualFunName;
}

export type ManualStatResult =
  | {
      kind: "keep";
      /** Panel-local source rows, one per non-empty group. */
      keep: number[];
      groups: number[];
    }
  | {
      kind: "aggregate";
      x: Float64Array;
      y: Float64Array;
      groups: number[];
      /** First source row of each group (for discrete aesthetic carry). */
      sampleRows: number[];
      /** Groups dropped because neither x nor y had a finite value. */
      droppedGroups: number;
    };

function groupBuckets(groups: readonly number[]): { order: number[]; rows: Map<number, number[]> } {
  const order: number[] = [];
  const rows = new Map<number, number[]>();
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!;
    let list = rows.get(g);
    if (list === undefined) {
      list = [];
      rows.set(g, list);
      order.push(g);
    }
    list.push(i);
  }
  return { order, rows };
}

function aggregateChannel(
  values: Float64Array,
  rowIds: readonly number[],
  fun: ManualAggFun,
): number {
  const finite: number[] = [];
  for (const row of rowIds) {
    const v = values[row]!;
    if (Number.isFinite(v)) finite.push(v);
  }
  if (finite.length === 0) return Number.NaN;
  const sorted = fun === "median";
  if (sorted) finite.sort((a, b) => a - b);
  return applySummaryFun(fun, finite, sorted);
}

export function statManual(input: ManualStatInput): ManualStatResult {
  const { groups, x, y, fun } = input;
  const { order, rows } = groupBuckets(groups);

  if (isManualKeepFun(fun)) {
    const keep: number[] = [];
    const outGroups: number[] = [];
    for (const g of order) {
      const list = rows.get(g)!;
      if (list.length === 0) continue;
      keep.push(fun === "first" ? list.at(0)! : list.at(-1)!);
      outGroups.push(g);
    }
    return { kind: "keep", keep, groups: outGroups };
  }

  const outX: number[] = [];
  const outY: number[] = [];
  const outGroups: number[] = [];
  const sampleRows: number[] = [];
  let droppedGroups = 0;
  for (const g of order) {
    const list = rows.get(g)!;
    if (list.length === 0) continue;
    const ax = aggregateChannel(x, list, fun);
    const ay = aggregateChannel(y, list, fun);
    if (!Number.isFinite(ax) && !Number.isFinite(ay)) {
      droppedGroups++;
      continue;
    }
    outX.push(ax);
    outY.push(ay);
    outGroups.push(g);
    sampleRows.push(list[0]!);
  }
  return {
    kind: "aggregate",
    x: Float64Array.from(outX),
    y: Float64Array.from(outY),
    groups: outGroups,
    sampleRows,
    droppedGroups,
  };
}
