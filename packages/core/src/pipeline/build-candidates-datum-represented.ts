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
    frame,
    table,
    frameRow,
    lineage,
    primitiveIndex,
  } = input;

  let representedRows =
    outlierSourceRow === null
      ? (sourceRowsByGroup.get(`${panelIndex}:${layerIndex}:${group}`) ?? [])
      : [outlierSourceRow];
  if (sourceRow === null && frame !== undefined) {
    representedRows = filterRepresentedSourceRows({
      frame,
      table,
      frameRow,
      baseRows: representedRows,
    });
  }
  return {
    representedRows,
    sourceOrder: sourceRow ?? outlierSourceRow ?? primitiveIndex,
    lineageKey: sourceRow === null ? lineage.intern(representedRows) : lineage.intern([sourceRow]),
  };
}
