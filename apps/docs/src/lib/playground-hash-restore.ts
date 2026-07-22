import { decodePlaygroundHash, type PlaygroundSeedV1 } from "./playground-codec";
import type { PlaygroundCandidatePhaseDetail } from "./playground-candidate-lifecycle";
import {
  sharedLinkRejectDiagnostic,
  verifiedSharedSeed,
  type PlaygroundShareCatalogs,
} from "./playground-link-policy";
import { reportPlaygroundDiagnostic, stagePlaygroundSeed } from "./playground-state";
import type {
  PlaygroundCandidateOrigin,
  PlaygroundDiagnostic,
  PlaygroundState,
} from "./playground-state-types";

export type PlaygroundHashRestoreOrigin = "initial-navigation" | "popstate";

export type PlaygroundHashRestoreDecision =
  | { readonly kind: "noop" }
  | { readonly kind: "stage-initial" }
  | {
      readonly kind: "reject";
      readonly diagnostic: PlaygroundDiagnostic;
      readonly statusMessage: string;
      /** Component must `replaceLocationHash(state.historyHash)` before applying state. */
      readonly replaceWithHistoryHash: true;
    }
  | {
      readonly kind: "stage";
      readonly seed: PlaygroundSeedV1;
      readonly historyHash: string;
    };

const REJECT_STATUS =
  "The shared link was rejected. The current local chart and a truthful URL were retained.";

/**
 * Pure decision table for playground location hash restore.
 * DOM replace and lifecycle emit stay in Playground.svelte.
 */
export function resolvePlaygroundHashRestore(
  origin: PlaygroundHashRestoreOrigin,
  hash: string,
  catalogs: PlaygroundShareCatalogs,
): PlaygroundHashRestoreDecision {
  const decoded = decodePlaygroundHash(hash);
  if (decoded.status === "absent") {
    return origin === "popstate" ? { kind: "stage-initial" } : { kind: "noop" };
  }
  if (decoded.status === "error") {
    return {
      kind: "reject",
      diagnostic: sharedLinkRejectDiagnostic(decoded.error),
      statusMessage: REJECT_STATUS,
      replaceWithHistoryHash: true,
    };
  }
  return {
    kind: "stage",
    seed: verifiedSharedSeed(hash, decoded.seed, catalogs),
    historyHash: hash,
  };
}

/** Apply a hash-restore decision to workbench state (no DOM). */
export function applyPlaygroundHashRestoreState(
  state: PlaygroundState,
  decision: PlaygroundHashRestoreDecision,
  origin: PlaygroundHashRestoreOrigin,
  initialSeed: PlaygroundSeedV1,
): PlaygroundState {
  if (decision.kind === "noop") return state;
  if (decision.kind === "stage-initial") {
    return stagePlaygroundSeed(state, initialSeed, origin, null);
  }
  if (decision.kind === "reject") {
    return reportPlaygroundDiagnostic(state, decision.diagnostic, decision.statusMessage);
  }
  return stagePlaygroundSeed(state, decision.seed, origin, decision.historyHash);
}

/**
 * Cancel-phase detail after a reject apply, or null if no prior candidate.
 * `statusAfterReport` must be the status **after** `applyPlaygroundHashRestoreState`.
 */
export function rejectRestoreCancelPhase(
  previous: { readonly generation: number; readonly origin: PlaygroundCandidateOrigin } | null,
  statusAfterReport: string,
): PlaygroundCandidatePhaseDetail | null {
  if (previous === null) return null;
  return {
    generation: previous.generation,
    origin: previous.origin,
    phase: "cancelled",
    status: statusAfterReport,
  };
}
