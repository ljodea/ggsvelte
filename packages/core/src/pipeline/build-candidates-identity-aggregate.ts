/**
 * Pre-bucket aggregate source-row lineage for identity-indexed candidates.
 * Built once with the identity index so mark resolve is O(1) lookup instead of
 * re-filtering the full group for every count/summary/boxplot/bin output mark.
 */
import type { BarParams } from "@ggsvelte/spec";

import { cellToNumber } from "../table.js";

import type { FacetPanelDef } from "./facets.js";
import type { LayerFrame } from "./types.js";

export function appendSourceRowByGroupX(input: {
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

  for (let frameRow = 0; frameRow < frame.n; frameRow++) {
    const group = frame.groups[frameRow] ?? 0;
    const bucket: number[] = [];
    sourceRowsByGroupBin.set(`${panelIndex}:${layerIndex}:${group}:${frameRow}`, bucket);
    if (frame.xmin === null || frame.xmax === null) continue;
    const first = frameRow === 0 || frame.groups[frameRow - 1] !== group;
    const last = frameRow === frame.n - 1 || frame.groups[frameRow + 1] !== group;
    const edge: BinEdge = {
      frameRow,
      lo: frame.xmin[frameRow]!,
      hi: frame.xmax[frameRow]!,
      first,
      last,
      bucket,
    };
    const list = binsByGroup.get(group);
    if (list === undefined) binsByGroup.set(group, [edge]);
    else list.push(edge);
  }

  // No bin edges: every output mark represents the full group (filter fallback).
  if (frame.xmin === null || frame.xmax === null) {
    for (let localRow = 0; localRow < inputGroups.length; localRow++) {
      const group = inputGroups[localRow]!;
      const sourceRow = facetPanel.sourceRows?.[localRow] ?? localRow;
      for (let frameRow = 0; frameRow < frame.n; frameRow++) {
        if ((frame.groups[frameRow] ?? 0) !== group) continue;
        sourceRowsByGroupBin
          .get(`${panelIndex}:${layerIndex}:${group}:${frameRow}`)
          ?.push(sourceRow);
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
