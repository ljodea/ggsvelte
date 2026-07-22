/**
 * Series identity + auto-mode for identity candidates.
 */
import type { CandidateBuildFacts } from "../../candidate-store.js";
import type { CellValue } from "../../table.js";
import { candidateAutoMode } from "../frame-candidates-auto-mode.js";
import type { ResolvedColorScale } from "../types.js";
import { ordinalSeriesRank } from "./datum-values.js";
import type { IdentityCandidateResolveContext, LocatedIdentityCandidate } from "./datum-types.js";

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

export function resolveIdentitySeriesAndMode(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): { group: number; seriesRank: number; autoMode: ReturnType<typeof candidateAutoMode> } {
  const { sourceRow, frame, derivedGroup, sourceValue, colorField, fillField, seriesByRow } =
    located;

  const { group, seriesRank } = resolveCandidateSeries({
    sourceRow,
    derivedGroup,
    seriesByRow,
    panelIndex: facts.panelIndex,
    layerIndex: facts.layerIndex,
    color: ctx.color,
    fill: ctx.fill,
    colorField,
    fillField,
    sourceValue,
  });
  const autoMode = candidateAutoMode(
    frame?.binding ?? ctx.bindings[facts.layerIndex]!,
    facts.primitiveIndex,
  );
  return { group, seriesRank, autoMode };
}
