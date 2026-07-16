/**
 * Series id/rank and inspection autoMode for identity candidates.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate.js";
import { resolveCandidateSeries } from "./build-candidates-datum-series.js";
import { candidateAutoMode } from "./frame.js";

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
