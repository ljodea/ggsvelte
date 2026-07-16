/**
 * Series identity and ordinal rank for identity candidates.
 * Represented-row lineage lives in build-candidates-datum-represented.
 */
import type { CellValue } from "../table.js";

import { ordinalSeriesRank } from "./build-candidates-datum-context.js";
import type { ResolvedColorScale } from "./types.js";

export { resolveRepresentedSourceRows } from "./build-candidates-datum-represented.js";

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
