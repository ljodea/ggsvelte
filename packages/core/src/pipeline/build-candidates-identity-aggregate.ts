/**
 * Pre-bucket aggregate source-row lineage for identity-indexed candidates.
 * Built once with the identity index so mark resolve is O(1) lookup instead of
 * re-filtering the full group for every count/summary/boxplot/bin output mark.
 */
import { filterBinRepresentedRows } from "./build-candidates-lineage-filters.js";
import type { FacetPanelDef } from "./facets.js";
import { deriveLayerGroups } from "./frame.js";
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

  // Collect panel-local rows per group, then map matched locals → source rows.
  const inputGroups = deriveLayerGroups(frame.binding, frame.table);
  const localRowsByGroup = new Map<number, number[]>();
  for (let localRow = 0; localRow < inputGroups.length; localRow++) {
    const group = inputGroups[localRow]!;
    const members = localRowsByGroup.get(group);
    if (members === undefined) localRowsByGroup.set(group, [localRow]);
    else members.push(localRow);
  }

  for (let frameRow = 0; frameRow < frame.n; frameRow++) {
    const group = frame.groups[frameRow] ?? 0;
    const localBase = localRowsByGroup.get(group) ?? [];
    const matchedLocal = filterBinRepresentedRows({
      frame,
      table: frame.table,
      frameRow,
      field,
      baseRows: localBase,
    });
    const matchedSource = matchedLocal.map((local) => facetPanel.sourceRows?.[local] ?? local);
    sourceRowsByGroupBin.set(`${panelIndex}:${layerIndex}:${group}:${frameRow}`, matchedSource);
  }
}
