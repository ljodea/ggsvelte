/**
 * Series, autoMode, annotation, and lineage attributes for identity candidates.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";
import type { CellValue } from "../table.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveAnnotationIntercepts } from "./build-candidates-datum-context.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate.js";
import {
  resolveCandidateSeries,
  resolveRepresentedSourceRows,
} from "./build-candidates-datum-series.js";
import { candidateAutoMode } from "./frame.js";

export interface IdentityCandidateAttrs {
  group: number;
  seriesRank: number;
  autoMode: ReturnType<typeof candidateAutoMode>;
  sourceOrder: number;
  lineageKey: number;
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
}

export function resolveIdentityCandidateAttrs(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): IdentityCandidateAttrs {
  const {
    sourceRow,
    frame,
    outlierSourceRow,
    frameRow,
    derivedGroup,
    sourceValue,
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
  return {
    group,
    seriesRank,
    autoMode,
    sourceOrder,
    lineageKey,
    annotationRule,
    annotationX,
    annotationY,
  };
}
