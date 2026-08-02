import { bandKey } from "../../scales/train.js";
import type { CellValue } from "../../table.js";
import { ColumnTable } from "../../table.js";
import { binIndexOf } from "../../stats/bin-breaks.js";
import { assignBinId, type BinnedBoundaries } from "../binned-scale.js";
import { shouldAggregateOnSemanticTemporalX } from "../frame-stats-shared.js";
import { positionColumn, xConversionOf } from "../temporal-position.js";
import type { FinalizedLayerFrame, LayerBinding } from "../types.js";
import { globalSourceRowForInputRow } from "../source-row-lineage.js";

/**
 * Loop-invariant column views for group×x lineage keys (#1307).
 * Resolve once per frame; index each input row without re-deriving columns.
 */
export type AggregateLineageXView =
  | {
      readonly kind: "binned";
      readonly transformed: Float64Array;
      readonly xBinning: BinnedBoundaries;
    }
  | { readonly kind: "semantic"; readonly semantic: Float64Array; readonly valid: Uint8Array }
  | { readonly kind: "raw"; readonly column: readonly CellValue[] };

/** Resolve conversion/parsed/position columns once for a frame's x field. */
export function resolveAggregateLineageXView(
  table: ColumnTable,
  field: string,
  binding: LayerBinding,
): AggregateLineageXView {
  // Only count aggregates on bin ids (frame.bin.xId). Summary/boxplot still
  // aggregate on actual x values even when a binned scale is attached.
  if (binding.xBinning !== undefined && (binding.layer.stat ?? "identity") === "count") {
    return {
      kind: "binned",
      transformed: positionColumn(table, field, xConversionOf(binding), binding.xTransform),
      xBinning: binding.xBinning,
    };
  }
  const conversion = xConversionOf(binding);
  const parsed = table.parsed(field, conversion.sourceParser, conversion.options);
  if (shouldAggregateOnSemanticTemporalX(binding, parsed.decision.status)) {
    return { kind: "semantic", semantic: parsed.semantic, valid: parsed.valid };
  }
  return { kind: "raw", column: table.column(field) };
}

function aggregateLineageXKeyFromView(view: AggregateLineageXView, localRow: number): string {
  if (view.kind === "binned") {
    return bandKey(assignBinId(view.transformed[localRow]!, view.xBinning));
  }
  if (view.kind === "semantic") {
    return bandKey(view.valid[localRow] === 1 ? view.semantic[localRow] : null);
  }
  return bandKey(view.column[localRow]);
}

/** Key used for count/summary/boxplot group×x lineage buckets (matches frame xValues). */
export function aggregateLineageXKey(
  table: ColumnTable,
  field: string,
  localRow: number,
  binding: LayerBinding,
  view?: AggregateLineageXView,
): string {
  return aggregateLineageXKeyFromView(
    view ?? resolveAggregateLineageXView(table, field, binding),
    localRow,
  );
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
  bucket: number[];
}

/**
 * Assign each source row to at most one bin in a single pass over the panel
 * rows, replaying the stat's own cut (O(n log B) binary search over the fuzzed
 * break grid, then an O(1) grid-bin → frame-row lookup) instead of re-scanning
 * the full group once per output bin (O(k·g)).
 * When the stat's cut or bin edges are absent, every mark represents the full
 * group: members are collected once per group and shared across that group's
 * frame rows (O(n+k)).
 */
export function buildBinLineageBuckets(input: {
  frame: FinalizedLayerFrame;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroupBin: Map<string, number[]>;
}): void {
  const { frame, panelIndex, layerIndex, sourceRowsByGroupBin } = input;
  const field = frame.binding.xField;
  if (field === null) return;

  // Pre-stat groups cached on the frame during buildFrame (issue #217).
  const inputGroups = frame.inputGroups;
  const binsByGroup = new Map<number, BinEdge[]>();
  // Without the stat's own cut we cannot reproduce its fuzzed membership, so
  // fall back to the same conservative "mark represents the whole group"
  // behaviour used when bin edges are absent.
  const cut = frame.binCut;
  const missingEdges =
    frame.xmin === null || frame.xmax === null || cut === undefined || cut === null;
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
    const edge: BinEdge = { frameRow, bucket };
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

  // Grid bin index → the frame row that emitted it. summary_bin omits empty
  // bins, so the grid index is not the frame row.
  const edgeByGridBin = new Map<number, Map<number, BinEdge>>();
  for (const [group, bins] of binsByGroup) {
    const byGridBin = new Map<number, BinEdge>();
    for (const edge of bins) byGridBin.set(cut!.binIndex[edge.frameRow]!, edge);
    edgeByGridBin.set(group, byGridBin);
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
    const byGridBin = edgeByGridBin.get(group);
    if (byGridBin === undefined || byGridBin.size === 0) continue;
    const value = xNumeric[localRow]!;
    if (!Number.isFinite(value)) continue;
    // Replay the stat's own cut (fuzzed breaks) — exact-edge predicates
    // disagree with it inside the fuzz band around a break (#905).
    const edge = byGridBin.get(binIndexOf(value, cut!.fuzzy, cut!.rightClosed));
    if (edge === undefined) continue;
    edge.bucket.push(globalSourceRowForInputRow(frame, localRow));
  }
}
