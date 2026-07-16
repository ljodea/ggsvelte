/**
 * Series, autoMode, annotation, and lineage attributes for identity candidates.
 */
import type { CandidateBuildFacts } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import type { IdentityCandidateAttrs } from "./build-candidates-datum-attrs-types.js";
import { resolveIdentityLineageAndAnnotation } from "./build-candidates-datum-lineage-ann.js";
import type { LocatedIdentityCandidate } from "./build-candidates-datum-locate.js";
import { resolveIdentitySeriesAndMode } from "./build-candidates-datum-series-mode.js";

export type { IdentityCandidateAttrs } from "./build-candidates-datum-attrs-types.js";

export function resolveIdentityCandidateAttrs(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
  located: LocatedIdentityCandidate,
): IdentityCandidateAttrs {
  const { group, seriesRank, autoMode } = resolveIdentitySeriesAndMode(ctx, facts, located);
  const lineageAnn = resolveIdentityLineageAndAnnotation(ctx, facts, located, group);
  return {
    group,
    seriesRank,
    autoMode,
    ...lineageAnn,
  };
}
