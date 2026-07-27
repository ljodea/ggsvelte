/**
 * Sample-load and undo workbench transitions extracted from Playground.svelte
 * so the decision paths can be unit-tested without the Svelte shell.
 *
 * Confirm dialogs, cancelActiveRun, and candidate lifecycle emission stay in
 * the component. This module only resolves lookup / confirm gates and returns
 * the next pure state bundle.
 */

import {
  defaultPlaygroundInteractions,
  type PlaygroundInteractions,
} from "./playground-agent-envelope";
import { createPlaygroundAgentState, type PlaygroundAgentState } from "./playground-agent-state";
import type { PlaygroundCandidateRef } from "./playground-candidate-lifecycle";
import type { PlaygroundSeedV1 } from "./playground-codec";
import {
  shouldConfirmDiscardForSampleLoad,
  shouldConfirmDiscardForUndo,
} from "./playground-link-policy";
import { stagePlaygroundSeed, stagePlaygroundUndo, type PlaygroundState } from "./playground-state";

/** Catalog row for sample load (seed-bearing; not the share-link catalog shape). */
export type WorkbenchSampleEntry = {
  readonly id: string;
  readonly seed: PlaygroundSeedV1;
};

export type SampleLoadPlan =
  | { readonly kind: "noop" }
  | { readonly kind: "needs_confirm" }
  | {
      readonly kind: "load";
      readonly previous: PlaygroundCandidateRef | null;
      readonly workbench: PlaygroundState;
      readonly interactions: PlaygroundInteractions;
      readonly pendingInteractions: null;
      readonly pendingSuccess: null;
      readonly mockNotice: false;
      readonly agent: PlaygroundAgentState;
    };

export type UndoPlan =
  | { readonly kind: "noop" }
  | { readonly kind: "needs_confirm" }
  | {
      readonly kind: "stage";
      readonly previous: PlaygroundCandidateRef | null;
      readonly workbench: PlaygroundState;
    };

/** Candidate ref for lifecycle notes; null when no in-flight candidate. */
export function workbenchCandidateRef(workbench: PlaygroundState): PlaygroundCandidateRef | null {
  const candidate = workbench.candidate;
  return candidate === null ? null : { generation: candidate.generation, origin: candidate.origin };
}

/**
 * Plan a sample load.
 *
 * @param confirmed - true after the user accepted the discard dialog (or when
 *   no confirm is required). When confirm is required and confirmed is false,
 *   returns `needs_confirm` so the shell can re-call after the dialog.
 */
export function planSampleLoad(
  workbench: PlaygroundState,
  id: string,
  samples: readonly WorkbenchSampleEntry[],
  confirmed: boolean,
): SampleLoadPlan {
  if (id === "") return { kind: "noop" };
  // Match Playground.svelte order: confirm-gate before catalog lookup so a
  // discard dialog still appears for unknown ids when the gate is open
  // (lookup then fails → noop after confirm).
  if (shouldConfirmDiscardForSampleLoad(workbench) && !confirmed) {
    return { kind: "needs_confirm" };
  }

  const sample = samples.find((entry) => entry.id === id);
  if (sample === undefined) return { kind: "noop" };

  const previous = workbenchCandidateRef(workbench);
  const next = stagePlaygroundSeed(workbench, sample.seed, "source");
  return {
    kind: "load",
    previous,
    workbench: next,
    interactions: defaultPlaygroundInteractions(),
    pendingInteractions: null,
    pendingSuccess: null,
    mockNotice: false,
    agent: createPlaygroundAgentState(),
  };
}

/**
 * Plan an undo transition.
 *
 * @param confirmed - true after the user accepted the discard dialog when
 *   `shouldConfirmDiscardForUndo` requires it. Re-evaluates guards on the
 *   re-call so a concurrent stage/busy change becomes a safe noop.
 */
export function planUndoChart(
  workbench: PlaygroundState,
  busy: boolean,
  confirmed: boolean,
): UndoPlan {
  if (workbench.undoSnapshots.length === 0 || workbench.candidate !== null) {
    return { kind: "noop" };
  }
  if (busy) return { kind: "noop" };
  if (shouldConfirmDiscardForUndo(workbench) && !confirmed) {
    return { kind: "needs_confirm" };
  }

  // After the candidate-null guard above, previous is always null — kept for
  // symmetry with sample-load / stage lifecycle notes.
  const previous = workbenchCandidateRef(workbench);
  return {
    kind: "stage",
    previous,
    workbench: stagePlaygroundUndo(workbench),
  };
}
