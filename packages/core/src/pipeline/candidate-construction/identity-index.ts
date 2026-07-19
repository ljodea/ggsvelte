import { bandKey } from "../../scales/train.js";
import { cellToNumber, ColumnTable } from "../../table.js";
import type { FacetPanelDef } from "../facets.js";
import { NO_ROW } from "../types.js";
import type { LayerFrame } from "../types.js";
import type { BarParams } from "@ggsvelte/spec";

// ---------------------------------------------------------------------------
// Aggregate lineage buckets
// ---------------------------------------------------------------------------
function appendSourceRowByGroupX(input: {
  sourceRowsByGroupX: Map<string, number[]>;
  panelIndex: number;
  layerIndex: number;
  group: number;
  xKey: string;
  sourceRow: number;
}): void {
  const key = `${input.panelIndex}:${input.layerIndex}:${input.group}:${input.xKey}`;
  const members = input.sourceRowsByGroupX.get(key);
  if (members === undefined) input.sourceRowsByGroupX.set(key, [input.sourceRow]);
  else members.push(input.sourceRow);
}

function appendSourceRowByGroupKey(
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
  facetPanel: FacetPanelDef;
  sourceRowsByGroupBin: Map<string, number[]>;
}): void {
  const { frame, panelIndex, layerIndex, facetPanel, sourceRowsByGroupBin } = input;
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
      const sourceRow = facetPanel.sourceRows?.[localRow] ?? localRow;
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

  const xColumn = frame.table.column(field);
  for (let localRow = 0; localRow < inputGroups.length; localRow++) {
    const group = inputGroups[localRow]!;
    const bins = binsByGroup.get(group);
    if (bins === undefined || bins.length === 0) continue;
    const value = cellToNumber(xColumn[localRow]!);
    if (!Number.isFinite(value)) continue;
    const idx = findBinIndex(value, bins, closed);
    if (idx < 0) continue;
    const sourceRow = facetPanel.sourceRows?.[localRow] ?? localRow;
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

// ---------------------------------------------------------------------------
// Candidate identity index
// ---------------------------------------------------------------------------
export interface CandidateIdentityIndex {
  readonly seriesByRow: Map<string, number>;
  readonly sourceRowsByGroup: Map<string, number[]>;
  /** `${panel}:${layer}:${group}:${bandKey(x)}` → source rows (count/summary/boxplot). */
  readonly sourceRowsByGroupX: Map<string, number[]>;
  /** `${panel}:${layer}:${group}:${frameRow}` → source rows (bin/histogram). */
  readonly sourceRowsByGroupBin: Map<string, number[]>;
  /**
   * `${panel}:${layer}:${group}` → source rows with finite y
   * (smooth/summary/boxplot). Built once so evaluation-grid marks (smooth n≈80)
   * reuse the same list instead of re-filtering O(g) per mark.
   */
  readonly sourceRowsByGroupY: Map<string, number[]>;
  readonly frameGroups: Map<string, number[]>;
}

export function buildCandidateIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): CandidateIdentityIndex {
  const seriesByRow = new Map<string, number>();
  const sourceRowsByGroup = new Map<string, number[]>();
  const sourceRowsByGroupX = new Map<string, number[]>();
  const sourceRowsByGroupBin = new Map<string, number[]>();
  const sourceRowsByGroupY = new Map<string, number[]>();
  const frameGroups = new Map<string, number[]>();
  for (let panelIndex = 0; panelIndex < panelFrames.length; panelIndex++) {
    for (const frame of panelFrames[panelIndex] ?? []) {
      const layerIndex = frame.binding.index;
      const frameKey = `${panelIndex}:${layerIndex}`;
      frameGroups.set(frameKey, [...new Set(frame.groups)]);
      // Pre-stat groups cached on the frame during buildFrame (issue #217).
      const inputGroups = frame.inputGroups;
      const stat = frame.binding.layer.stat ?? "identity";
      // Only count/summary/boxplot resolve via group×x buckets; skip for other layers.
      const bucketByX = stat === "count" || stat === "summary" || stat === "boxplot";
      const xField = frame.binding.xField;
      const xColumn = bucketByX && xField !== null ? frame.table.column(xField) : null;
      // Finite-y membership uses panel-local table indexes (localRow), then stores
      // source-table rows — same mapping as sourceRowsByGroup itself.
      const yField = frame.binding.yField;
      const finiteY =
        (stat === "smooth" || stat === "summary" || stat === "boxplot") && yField !== null;
      const yColumn = finiteY ? frame.table.column(yField) : null;
      for (let localRow = 0; localRow < inputGroups.length; localRow++) {
        const group = inputGroups[localRow]!;
        const sourceRow = facetPanels[panelIndex]!.sourceRows?.[localRow] ?? localRow;
        const key = `${frameKey}:${group}`;
        appendSourceRowByGroupKey(sourceRowsByGroup, key, sourceRow);
        if (xColumn !== null) {
          appendSourceRowByGroupX({
            sourceRowsByGroupX,
            panelIndex,
            layerIndex,
            group,
            xKey: bandKey(xColumn[localRow]),
            sourceRow,
          });
        }
        if (yColumn !== null && Number.isFinite(cellToNumber(yColumn[localRow]!))) {
          appendSourceRowByGroupKey(sourceRowsByGroupY, key, sourceRow);
        }
      }
      if (stat === "bin") {
        buildBinLineageBuckets({
          frame,
          panelIndex,
          layerIndex,
          facetPanel: facetPanels[panelIndex]!,
          sourceRowsByGroupBin,
        });
      }
      for (let i = 0; i < frame.rowIndex.length; i++) {
        const sourceRow = frame.rowIndex[i]!;
        if (sourceRow !== NO_ROW) {
          seriesByRow.set(`${panelIndex}:${layerIndex}:${sourceRow}`, frame.groups[i] ?? 0);
        }
      }
    }
  }
  // Seal bucket arrays so resolve-time consumers cannot mutate shared lineage.
  for (const map of [
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
  ]) {
    for (const [key, rows] of map) map.set(key, Object.freeze(rows) as number[]);
  }
  return {
    seriesByRow,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    sourceRowsByGroupY,
    frameGroups,
  };
}

export function createLazyIdentityIndex(
  panelFrames: readonly (readonly LayerFrame[])[],
  facetPanels: readonly FacetPanelDef[],
): () => CandidateIdentityIndex {
  let identityIndex: CandidateIdentityIndex | null = null;
  return () => {
    if (identityIndex !== null) return identityIndex;
    identityIndex = buildCandidateIdentityIndex(panelFrames, facetPanels);
    return identityIndex;
  };
}

// ---------------------------------------------------------------------------
// Lineage filters
// ---------------------------------------------------------------------------
export function filterAggregateXRows(input: {
  table: ColumnTable;
  field: string;
  outputX: unknown;
  baseRows: readonly number[];
}): number[] {
  const outputKey = bandKey(input.outputX);
  const col = input.table.column(input.field);
  return input.baseRows.filter((row) => bandKey(col[row]) === outputKey);
}

export function filterBinRepresentedRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const { frame, table, frameRow, field, baseRows } = input;
  if (frame.xmin === null || frame.xmax === null) return [...baseRows];
  const hi = frame.xmax[frameRow]!;
  const lo = frame.xmin[frameRow]!;
  const closed = ((frame.binding.layer.params ?? {}) as BarParams).closed ?? "right";
  const frameGroup = frame.groups[frameRow];
  const firstInGroup = frameRow === 0 || frame.groups[frameRow - 1] !== frameGroup;
  const lastInGroup = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== frameGroup;
  const col = table.column(field);
  return baseRows.filter((row) => {
    const value = cellToNumber(col[row]!);
    if (!Number.isFinite(value)) return false;
    return closed === "right"
      ? value <= hi && (value > lo || (firstInGroup && value >= lo))
      : value >= lo && (value < hi || (lastInGroup && value <= hi));
  });
}

export function filterAggregateYRows(input: {
  table: ColumnTable;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const col = input.table.column(input.field);
  return input.baseRows.filter((row) => Number.isFinite(cellToNumber(col[row]!)));
}

// ---------------------------------------------------------------------------
// Represented lineage
// ---------------------------------------------------------------------------
export function filterRepresentedSourceRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  baseRows: readonly number[];
  /** Series group of the mark (needed for index keys). */
  group?: number;
  panelIndex?: number;
  layerIndex?: number;
  sourceRowsByGroupX?: Map<string, number[]>;
  sourceRowsByGroupBin?: Map<string, number[]>;
  /** Precomputed finite-y rows per `${panel}:${layer}:${group}` (smooth/summary/boxplot). */
  sourceRowsByGroupY?: Map<string, number[]>;
}): number[] {
  const { frame, table, frameRow } = input;
  const stat = frame.binding.layer.stat ?? "identity";
  const aggregateXField = frame.binding.xField;
  const aggregateYField = frame.binding.yField;
  const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
  const group = input.group ?? frame.groups[frameRow] ?? 0;
  const panelIndex = input.panelIndex;
  const layerIndex = input.layerIndex;
  const indexKeyPrefix =
    panelIndex !== undefined && layerIndex !== undefined
      ? `${panelIndex}:${layerIndex}:${group}`
      : null;

  const needsX =
    aggregateXField !== null &&
    outputX !== null &&
    (stat === "count" || stat === "summary" || stat === "boxplot");
  const needsBin = stat === "bin" && aggregateXField !== null;
  const needsY =
    (stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null;

  // Full-group finite-y path (smooth; summary/boxplot without x/bin): return the
  // shared cached array before cloning baseRows — keeps resolve O(1) per mark.
  if (needsY && !needsX && !needsBin && indexKeyPrefix !== null && input.sourceRowsByGroupY) {
    const cachedY = input.sourceRowsByGroupY.get(indexKeyPrefix);
    if (cachedY !== undefined) return cachedY;
  }

  let representedRows = [...input.baseRows];
  if (needsX) {
    representedRows =
      (indexKeyPrefix !== null && input.sourceRowsByGroupX !== undefined
        ? input.sourceRowsByGroupX.get(`${indexKeyPrefix}:${bandKey(outputX)}`)
        : undefined) ??
      filterAggregateXRows({
        table,
        field: aggregateXField,
        outputX,
        baseRows: representedRows,
      });
  } else if (needsBin) {
    representedRows =
      (indexKeyPrefix !== null && input.sourceRowsByGroupBin !== undefined
        ? input.sourceRowsByGroupBin.get(`${indexKeyPrefix}:${frameRow}`)
        : undefined) ??
      filterBinRepresentedRows({
        frame,
        table,
        frameRow,
        field: aggregateXField,
        baseRows: representedRows,
      });
  }

  if (needsY) {
    representedRows = filterAggregateYRows({
      table,
      field: aggregateYField,
      baseRows: representedRows,
    });
  }

  return representedRows;
}
