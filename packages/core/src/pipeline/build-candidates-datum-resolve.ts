/**
 * Resolve one identity-indexed candidate datum from scene/frame/index context.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveAnnotationIntercepts } from "./build-candidates-datum-context.js";
import { locateIdentityCandidate } from "./build-candidates-datum-locate.js";
import {
  resolveCandidateSeries,
  resolveRepresentedSourceRows,
} from "./build-candidates-datum-series.js";
import { resolveCandidateLogicalValues } from "./build-candidates-datum-values.js";
import { candidateAutoMode } from "./frame.js";

export type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";

export function resolveIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): CandidateDatum {
  const located = locateIdentityCandidate(ctx, facts);
  const {
    sourceRow,
    frame,
    outlierSourceRow,
    frameRow,
    derivedGroup,
    sourceValue,
    xField,
    yField,
    colorField,
    fillField,
    seriesByRow,
    sourceRowsByGroup,
  } = located;

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
  const { annotationRule, annotationX, annotationY } = resolveAnnotationIntercepts({
    frame,
    primitiveIndex: facts.primitiveIndex,
  });
  const { sourceOrder, lineageKey } = resolveRepresentedSourceRows({
    outlierSourceRow,
    sourceRow,
    group,
    panelIndex: facts.panelIndex,
    layerIndex: facts.layerIndex,
    sourceRowsByGroup,
    frame,
    table: ctx.table,
    frameRow,
    lineage: ctx.lineage,
    primitiveIndex: facts.primitiveIndex,
  });
  const { xValue, yValue } = resolveCandidateLogicalValues({
    annotationRule,
    annotationX,
    annotationY,
    outlierSourceRow,
    sourceRow,
    frame,
    frameRow,
    primitiveIndex: facts.primitiveIndex,
    sourceValue,
    xField,
    yField,
  });
  return {
    xValue,
    yValue,
    seriesId: group,
    seriesRank,
    sourceOrder,
    lineage: lineageKey,
    autoMode,
  };
}
