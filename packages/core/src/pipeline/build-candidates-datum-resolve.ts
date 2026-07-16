/**
 * Resolve one identity-indexed candidate datum from scene/frame/index context.
 */
import type { CandidateBuildFacts, CandidateDatum } from "../candidate-store.js";

import type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";
import { assembleIdentityCandidateDatum } from "./build-candidates-datum-assemble.js";
import { locateIdentityCandidate } from "./build-candidates-datum-locate.js";

export type { IdentityCandidateResolveContext } from "./build-candidates-datum-ctx.js";

export function resolveIdentityCandidateDatum(
  ctx: IdentityCandidateResolveContext,
  facts: CandidateBuildFacts,
): CandidateDatum {
  const located = locateIdentityCandidate(ctx, facts);
  return assembleIdentityCandidateDatum(ctx, facts, located);
}
