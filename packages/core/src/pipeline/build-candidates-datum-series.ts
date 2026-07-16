/**
 * Series identity, rank, and represented-row lineage for identity candidates.
 */
import type { LineageStore } from "../identity.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import { ordinalSeriesRank } from "./build-candidates-datum-context.js";
import { filterRepresentedSourceRows } from "./build-candidates-lineage.js";
import type { LayerFrame, ResolvedColorScale } from "./types.js";

export function resolveCandidateSeries(input: {
  sourceRow: number | null;
  derivedGroup: number;
  seriesByRow: Map<string, number>;
  panelIndex: number;
  layerIndex: number;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  colorField: string | undefined;
  fillField: string | undefined;
  sourceValue: (field: string | undefined) => CellValue;
}): { group: number; seriesRank: number } {
  const {
    sourceRow,
    derivedGroup,
    seriesByRow,
    panelIndex,
    layerIndex,
    color,
    fill,
    colorField,
    fillField,
    sourceValue,
  } = input;
  const group =
    sourceRow === null
      ? derivedGroup
      : (seriesByRow.get(`${panelIndex}:${layerIndex}:${sourceRow}`) ?? 0);
  const seriesRank = ordinalSeriesRank({
    color,
    fill,
    colorField,
    fillField,
    sourceRow,
    sourceValue,
    group,
  });
  return { group, seriesRank };
}

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
