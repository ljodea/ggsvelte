/**
 * Assemble CandidateDatum from located identity context + series/lineage/values.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { resolveIdentityCandidateAttrs } from "./build-candidates-datum-attrs.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate.js";
import { resolveCandidateLogicalValues } from "./build-candidates-datum-values.js";

export function assembleIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): CandidateDatum {
  const attrs = resolveIdentityCandidateAttrs(ctx, facts, located);
  const { xValue, yValue } = resolveCandidateLogicalValues({
    annotationRule: attrs.annotationRule,
    annotationX: attrs.annotationX,
    annotationY: attrs.annotationY,
    outlierSourceRow: located.outlierSourceRow,
    sourceRow: located.sourceRow,
    frame: located.frame,
    frameRow: located.frameRow,
    primitiveIndex: facts.primitiveIndex,
    sourceValue: located.sourceValue,
    xField: located.xField,
    yField: located.yField,
  });
  return {
    xValue,
    yValue,
    seriesId: attrs.group,
    seriesRank: attrs.seriesRank,
    sourceOrder: attrs.sourceOrder,
    lineage: attrs.lineageKey,
    autoMode: attrs.autoMode,
  };
}
