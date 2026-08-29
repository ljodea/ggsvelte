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
  | {
      readonly kind: "semantic";
      readonly semantic: Float64Array;
      readonly valid: Uint8Array;
    }
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

function groupFrameRows(frame: FinalizedLayerFrame): Map<number, number[]> {
  const rowsByGroup = new Map<number, number[]>();
  for (let frameRow = 0; frameRow < frame.n; frameRow++) {
    const group = frame.groups[frameRow] ?? 0;
    const rows = rowsByGroup.get(group);
    if (rows === undefined) rowsByGroup.set(group, [frameRow]);
    else rows.push(frameRow);
  }
  return rowsByGroup;
}

function buildWholeGroupBinBuckets(input: {
  frame: FinalizedLayerFrame;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroupBin: Map<string, number[]>;
}): void {
  const membersByGroup = new Map<number, number[]>();
  for (let localRow = 0; localRow < input.frame.inputGroups.length; localRow++) {
    const group = input.frame.inputGroups[localRow]!;
    const sourceRow = globalSourceRowForInputRow(input.frame, localRow);
    const members = membersByGroup.get(group);
    if (members === undefined) membersByGroup.set(group, [sourceRow]);
    else members.push(sourceRow);
  }
  for (const [group, frameRows] of groupFrameRows(input.frame)) {
    const members = membersByGroup.get(group) ?? [];
    for (const frameRow of frameRows) {
      input.sourceRowsByGroupBin.set(
        `${input.panelIndex}:${input.layerIndex}:${group}:${frameRow}`,
        members,
      );
    }
  }
}

function buildBinEdges(input: {
  frame: FinalizedLayerFrame;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroupBin: Map<string, number[]>;
}): Map<number, BinEdge[]> {
  const binsByGroup = new Map<number, BinEdge[]>();
  for (let frameRow = 0; frameRow < input.frame.n; frameRow++) {
    const group = input.frame.groups[frameRow] ?? 0;
    const bucket: number[] = [];
    input.sourceRowsByGroupBin.set(
      `${input.panelIndex}:${input.layerIndex}:${group}:${frameRow}`,
      bucket,
    );
    const list = binsByGroup.get(group);
    const edge: BinEdge = { frameRow, bucket };
    if (list === undefined) binsByGroup.set(group, [edge]);
    else list.push(edge);
  }
  return binsByGroup;
}

function indexEdgesByGridBin(
  binsByGroup: ReadonlyMap<number, readonly BinEdge[]>,
  binIndex: ArrayLike<number>,
): Map<number, Map<number, BinEdge>> {
  const edgeByGridBin = new Map<number, Map<number, BinEdge>>();
  for (const [group, bins] of binsByGroup) {
    const byGridBin = new Map<number, BinEdge>();
    for (const edge of bins) byGridBin.set(binIndex[edge.frameRow]!, edge);
    edgeByGridBin.set(group, byGridBin);
  }
  return edgeByGridBin;
}

function populateBinEdges(input: {
  frame: FinalizedLayerFrame;
  field: string;
  binsByGroup: ReadonlyMap<number, readonly BinEdge[]>;
}): void {
  const { frame, field } = input;
  const cut = frame.binCut!;
  const edgeByGridBin = indexEdgesByGridBin(input.binsByGroup, cut.binIndex);
  const xNumeric = positionColumn(
    frame.table,
    field,
    xConversionOf(frame.binding),
    frame.binding.xTransform,
  );
  for (let localRow = 0; localRow < frame.inputGroups.length; localRow++) {
    const group = frame.inputGroups[localRow]!;
    const byGridBin = edgeByGridBin.get(group);
    if (byGridBin === undefined || byGridBin.size === 0) continue;
    const value = xNumeric[localRow]!;
    if (!Number.isFinite(value)) continue;
    const edge = byGridBin.get(binIndexOf(value, cut.fuzzy, cut.rightClosed));
    if (edge === undefined) continue;
    edge.bucket.push(globalSourceRowForInputRow(frame, localRow));
  }
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
  const { frame } = input;
  const field = frame.binding.xField;
  if (field === null) return;
  // Without the stat's own cut we cannot reproduce its fuzzed membership, so
  // fall back to the same conservative "mark represents the whole group"
  // behaviour used when bin edges are absent.
  const cut = frame.binCut;
  if (frame.xmin === null || frame.xmax === null || cut === undefined || cut === null) {
    buildWholeGroupBinBuckets(input);
    return;
  }
  populateBinEdges({ frame, field, binsByGroup: buildBinEdges(input) });
}
