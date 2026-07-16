/**
 * Annotation intercepts and represented-row lineage for identity candidates.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";
import type { CellValue } from "../table.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveAnnotationIntercepts } from "./build-candidates-datum-context.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate.js";
import { resolveRepresentedSourceRows } from "./build-candidates-datum-series.js";

export function resolveIdentityLineageAndAnnotation(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
  group: number,
): {
  sourceOrder: number;
  lineageKey: number;
  annotationRule: boolean;
  annotationX: CellValue;
  annotationY: CellValue;
} {
  const { sourceRow, frame, outlierSourceRow, frameRow, sourceRowsByGroup } = located;
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
  return { sourceOrder, lineageKey, annotationRule, annotationX, annotationY };
}
