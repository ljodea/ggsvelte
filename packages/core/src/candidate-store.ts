/**
 * Public candidate-store surface. Implementation is split across:
 * - candidate-axis-token.ts — logical axis value identity
 * - candidate-store-types.ts — public contracts
 * - candidate-geometry.ts — pure geometry hit helpers
 * - candidate-store-eager.ts — compact indexes + query methods
 * - candidate-store-lazy.ts — deferred construction shell
 */
export { canonicalAxisToken } from "./candidate-axis-token.js";
export type { CanonicalAxisToken } from "./candidate-axis-token.js";
export { buildCandidateStore } from "./candidate-store-lazy.js";
export type {
  CandidateBuildFacts,
  CandidateDatum,
  CandidateFacts,
  CandidateGroup,
  CandidateInspectMode,
  CandidateMatch,
  CandidateRange,
  CandidateStore,
  CandidateStoreOptions,
  ResolvedCandidateInspectMode,
  TraversalDirection,
} from "./candidate-store-types.js";
