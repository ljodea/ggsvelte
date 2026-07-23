import type { BarParams } from "@ggsvelte/spec";

import { bandKey } from "../../scales/train.js";
import { ColumnTable } from "../../table.js";
import { assignBinId } from "../binned-scale.js";
import { shouldAggregateOnSemanticTemporalX } from "../frame-stats-shared.js";
import { positionColumn, xConversionOf } from "../temporal-position.js";
import type { LayerBinding, LayerFrame } from "../types.js";
import { globalSourceRowForInputRow } from "../source-row-lineage.js";

/** Key used for count/summary/boxplot group×x lineage buckets (matches frame xValues). */
export function aggregateLineageXKey(
  table: ColumnTable,
  field: string,
  localRow: number,
  binding: LayerBinding,
): string {
  // Only count aggregates on bin ids (frame.xBinId). Summary/boxplot still
  // aggregate on actual x values even when a binned scale is attached.
  if (binding.xBinning !== undefined && (binding.layer.stat ?? "identity") === "count") {
    const transformed = positionColumn(table, field, xConversionOf(binding), binding.xTransform);
    return bandKey(assignBinId(transformed[localRow]!, binding.xBinning));
  }
  const conversion = xConversionOf(binding);
  const parsed = table.parsed(field, conversion.sourceParser, conversion.options);
  if (shouldAggregateOnSemanticTemporalX(binding, parsed.decision.status)) {
    return bandKey(parsed.valid[localRow] === 1 ? parsed.semantic[localRow] : null);
  }
  return bandKey(table.column(field)[localRow]);
}

export function appendSourceRowByGroupX(input: {
  sourceRowsByGroupX: Map<string, number[]>;
  panelIndex: number;
  layerIndex: number;
  group: number;
  xKey: string;
  sourceRow: number;
  /** When false, ensure the bucket exists but do not push (all-non-finite y path). */
  include: boolean;
}): void {
  const key = `${input.panelIndex}:${input.layerIndex}:${input.group}:${input.xKey}`;
  const members = input.sourceRowsByGroupX.get(key);
  if (members === undefined) {
    input.sourceRowsByGroupX.set(key, input.include ? [input.sourceRow] : []);
    return;
  }
  if (input.include) members.push(input.sourceRow);
}

export function appendSourceRowByGroupKey(
  map: Map<string, number[]>,
  key: string,
  sourceRow: number,
): void {
  const members = map.get(key);
  if (members === undefined) map.set(key, [sourceRow]);
  else members.push(sourceRow);
}

interface BinEdge {
  frameRow: number;
  lo: number;
  hi: number;
  first: boolean;
  last: boolean;
  bucket: number[];
}

/**
 * Assign each source row to at most one bin in a single pass over the panel
 * rows (O(n log k) per group via binary search on ordered bin edges), instead
 * of re-scanning the full group once per output bin (O(k·g)).
 * When bin edges are absent, every mark represents the full group: members are
 * collected once per group and shared across that group's frame rows (O(n+k)).
 */
export function buildBinLineageBuckets(input: {
  frame: LayerFrame;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroupBin: Map<string, number[]>;
}): void {
  const { frame, panelIndex, layerIndex, sourceRowsByGroupBin } = input;
  const field = frame.binding.xField;
  if (field === null) return;

  // Pre-stat groups cached on the frame during buildFrame (issue #217).
  const inputGroups = frame.inputGroups;
  const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
  const binsByGroup = new Map<number, BinEdge[]>();
  const missingEdges = frame.xmin === null || frame.xmax === null;
  /** group → frame rows (missing-edges path only; enables O(n+k) fill). */
  const frameRowsByGroup = missingEdges ? new Map<number, number[]>() : null;

  for (let frameRow = 0; frameRow < frame.n; frameRow++) {
    const group = frame.groups[frameRow] ?? 0;
    if (frameRowsByGroup !== null) {
      const rows = frameRowsByGroup.get(group);
      if (rows === undefined) frameRowsByGroup.set(group, [frameRow]);
      else rows.push(frameRow);
      continue;
    }
    const bucket: number[] = [];
    sourceRowsByGroupBin.set(`${panelIndex}:${layerIndex}:${group}:${frameRow}`, bucket);
    const first = frameRow === 0 || frame.groups[frameRow - 1] !== group;
    const last = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== group;
    const edge: BinEdge = {
      frameRow,
      lo: frame.xmin![frameRow]!,
      hi: frame.xmax![frameRow]!,
      first,
      last,
      bucket,
    };
    const list = binsByGroup.get(group);
    if (list === undefined) binsByGroup.set(group, [edge]);
    else list.push(edge);
  }

  // No bin edges: every output mark represents the full group (filter fallback).
  // Pre-index group → frame rows, collect members O(n), share one array per group O(k).
  if (frameRowsByGroup !== null) {
    const membersByGroup = new Map<number, number[]>();
    for (let localRow = 0; localRow < inputGroups.length; localRow++) {
      const group = inputGroups[localRow]!;
      const sourceRow = globalSourceRowForInputRow(frame, localRow);
      const members = membersByGroup.get(group);
      if (members === undefined) membersByGroup.set(group, [sourceRow]);
      else members.push(sourceRow);
    }
    for (const [group, frameRows] of frameRowsByGroup) {
      const members = membersByGroup.get(group) ?? [];
      for (const frameRow of frameRows) {
        sourceRowsByGroupBin.set(`${panelIndex}:${layerIndex}:${group}:${frameRow}`, members);
      }
    }
    return;
  }

  for (const bins of binsByGroup.values()) {
    bins.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  }

  // Bin edges are in scale space after pre-stat transforms; compare source
  // rows in the same space so log/sqrt histograms retain lineage.
  const xNumeric = positionColumn(
    frame.table,
    field,
    xConversionOf(frame.binding),
    frame.binding.xTransform,
  );
  for (let localRow = 0; localRow < inputGroups.length; localRow++) {
    const group = inputGroups[localRow]!;
    const bins = binsByGroup.get(group);
    if (bins === undefined || bins.length === 0) continue;
    const value = xNumeric[localRow]!;
    if (!Number.isFinite(value)) continue;
    const idx = findBinIndex(value, bins, closed);
    if (idx < 0) continue;
    const sourceRow = globalSourceRowForInputRow(frame, localRow);
    bins[idx]!.bucket.push(sourceRow);
  }
}

function findBinIndex(value: number, bins: readonly BinEdge[], closed: "right" | "left"): number {
  if (closed === "right") {
    // First bin with hi >= value, then verify left edge (lo, hi] / first [lo, hi].
    let lo = 0;
    let hi = bins.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bins[mid]!.hi < value) lo = mid + 1;
      else hi = mid;
    }
    if (lo >= bins.length) return -1;
    const bin = bins[lo]!;
    return value <= bin.hi && (value > bin.lo || (bin.first && value >= bin.lo)) ? lo : -1;
  }

  // Last bin with lo <= value, then verify right edge [lo, hi) / last [lo, hi].
  let lo = 0;
  let hi = bins.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bins[mid]!.lo <= value) lo = mid + 1;
    else hi = mid;
  }
  const idx = lo - 1;
  if (idx < 0) return -1;
  const bin = bins[idx]!;
  return value >= bin.lo && (value < bin.hi || (bin.last && value <= bin.hi)) ? idx : -1;
}
