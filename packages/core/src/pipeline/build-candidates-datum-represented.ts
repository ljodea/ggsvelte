/**
 * Represented source-row lineage for identity/stat candidates.
 */
import type { LineageStore } from "../identity.js";
import type { ColumnTable } from "../table.js";

import { filterRepresentedSourceRows } from "./build-candidates-lineage.js";
import type { LayerFrame } from "./types.js";

export function resolveRepresentedSourceRows(input: {
  outlierSourceRow: number | null;
  sourceRow: number | null;
  group: number;
  panelIndex: number;
  layerIndex: number;
  sourceRowsByGroup: Map<string, number[]>;
  sourceRowsByGroupX?: Map<string, number[]>;
  sourceRowsByGroupBin?: Map<string, number[]>;
  frame: LayerFrame | undefined;
  table: ColumnTable;
  frameRow: number;
  lineage: LineageStore<number>;
  primitiveIndex: number;
}): { representedRows: number[]; sourceOrder: number; lineageKey: number } {
  const {
    outlierSourceRow,
    sourceRow,
    group,
    panelIndex,
    layerIndex,
    sourceRowsByGroup,
    sourceRowsByGroupX,
    sourceRowsByGroupBin,
    frame,
    table,
    frameRow,
    lineage,
    primitiveIndex,
  } = input;

  // Outliers already pin an exact source row — do not re-expand via aggregate
  // group×x / bin indexes (those buckets contain every row the box represents).
  let representedRows =
    outlierSourceRow === null
      ? (sourceRowsByGroup.get(`${panelIndex}:${layerIndex}:${group}`) ?? [])
      : [outlierSourceRow];
  if (sourceRow === null && outlierSourceRow === null && frame !== undefined) {
    const filterInput: Parameters<typeof filterRepresentedSourceRows>[0] = {
      frame,
      table,
      frameRow,
      baseRows: representedRows,
      group,
      panelIndex,
      layerIndex,
    };
    if (sourceRowsByGroupX) filterInput.sourceRowsByGroupX = sourceRowsByGroupX;
    if (sourceRowsByGroupBin) filterInput.sourceRowsByGroupBin = sourceRowsByGroupBin;
    representedRows = filterRepresentedSourceRows(filterInput);
  }
  return {
    representedRows,
    sourceOrder: sourceRow ?? outlierSourceRow ?? primitiveIndex,
    lineageKey: sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
  };
}
