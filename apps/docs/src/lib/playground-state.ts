import type { PortableSpec } from "@ggsvelte/spec";

import {
  encodePlaygroundSeed,
  validatePlaygroundSeed,
  type PlaygroundSeedV1,
} from "./playground-codec";
import { serializePlaygroundSpec, validatePlaygroundDraft } from "./playground-draft-validate";

export { serializePlaygroundSpec } from "./playground-draft-validate";

export type PlaygroundDiagnosticSource = "playground" | "validation" | "pipeline" | "export";

export interface PlaygroundDiagnostic {
  readonly source: PlaygroundDiagnosticSource;
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly fix?: string;
}

export type PlaygroundCandidateOrigin =
  | "apply"
  | "source"
  | "reset"
  | "undo"
  | "initial-navigation"
  | "popstate";

export interface PlaygroundSnapshot {
  readonly sourceBaseline: PlaygroundSeedV1;
  readonly seed: PlaygroundSeedV1;
  readonly draft: string;
  readonly committed: PortableSpec;
  readonly rendered: PortableSpec;
  readonly renderConfirmed: boolean;
  readonly historyHash: string | null;
}

export interface PlaygroundCandidate {
  readonly generation: number;
  readonly origin: PlaygroundCandidateOrigin;
  readonly next: PlaygroundSnapshot;
  readonly undoSnapshotsAfterPromotion?: readonly PlaygroundSnapshot[];
}

export interface PlaygroundNavigationRecovery {
  readonly replaceHash: string | null;
  readonly preserveForward: true;
}

export interface PlaygroundState extends PlaygroundSnapshot {
  readonly candidate: PlaygroundCandidate | null;
  readonly diagnostics: readonly PlaygroundDiagnostic[];
  readonly lastValid: boolean;
  readonly status: string;
  readonly nextGeneration: number;
  readonly undoSnapshots: readonly PlaygroundSnapshot[];
  readonly synchronized: boolean;
  readonly canCopyOrShare: boolean;
  readonly navigationRecovery: PlaygroundNavigationRecovery | null;
  readonly historyIntent: "none";
}

export const PLAYGROUND_MAX_UNDO_SNAPSHOTS = 20;

function finalize(
  state: Omit<PlaygroundState, "synchronized" | "canCopyOrShare">,
): PlaygroundState {
  const synchronized = state.draft === serializePlaygroundSpec(state.committed);
  return {
    ...state,
    synchronized,
    canCopyOrShare:
      synchronized &&
      state.renderConfirmed &&
      state.candidate === null &&
      state.diagnostics.length === 0,
  };
}

function stage(
  state: PlaygroundState,
  origin: PlaygroundCandidateOrigin,
  next: PlaygroundSnapshot,
  draft = state.draft,
  undoSnapshotsAfterPromotion?: readonly PlaygroundSnapshot[],
): PlaygroundState {
  return finalize({
    ...state,
    draft,
    candidate: {
      generation: state.nextGeneration,
      origin,
      next,
      ...(undoSnapshotsAfterPromotion === undefined ? {} : { undoSnapshotsAfterPromotion }),
    },
    diagnostics: [],
    lastValid: false,
    status: "Checking the next chart before replacing the last valid result.",
    nextGeneration: state.nextGeneration + 1,
    navigationRecovery: null,
    historyIntent: "none",
  });
}

export function createPlaygroundState(
  seed: PlaygroundSeedV1,
  historyHash: string | null = null,
): PlaygroundState {
  const bounded = validatePlaygroundSeed(seed);
  const draft = serializePlaygroundSpec(bounded.spec);
  return finalize({
    sourceBaseline: bounded,
    seed: bounded,
    draft,
    committed: bounded.spec,
    rendered: bounded.spec,
    renderConfirmed: false,
    historyHash,
    candidate: null,
    diagnostics: [],
    lastValid: false,
    status: "Ready.",
    nextGeneration: 1,
    undoSnapshots: [],
    navigationRecovery: null,
    historyIntent: "none",
  });
}

export function editPlaygroundDraft(state: PlaygroundState, draft: string): PlaygroundState {
  return finalize({
    ...state,
    draft,
    candidate: null,
    diagnostics: [],
    lastValid: draft !== serializePlaygroundSpec(state.committed),
    status:
      draft === serializePlaygroundSpec(state.committed)
        ? "Draft matches the last valid result."
        : "Draft changed. Apply it to check and render the next chart.",
    navigationRecovery: null,
    historyIntent: "none",
  });
}

function invalidDraft(
  state: PlaygroundState,
  diagnostics: readonly PlaygroundDiagnostic[],
): PlaygroundState {
  return finalize({
    ...state,
    candidate: null,
    diagnostics,
    lastValid: true,
    status: "The draft was not applied. The last valid result is still shown.",
    navigationRecovery: null,
    historyIntent: "none",
  });
}

export function stagePlaygroundDraft(state: PlaygroundState): PlaygroundState {
  const validated = validatePlaygroundDraft(state.draft);
  if (!validated.ok) return invalidDraft(state, validated.diagnostics);

  const next: PlaygroundSnapshot = {
    sourceBaseline: state.sourceBaseline,
    seed: validated.seed,
    draft: validated.canonicalDraft,
    committed: validated.spec,
    rendered: validated.spec,
    renderConfirmed: true,
    historyHash: null,
  };
  return stage(state, "apply", next, validated.canonicalDraft);
}

export function stagePlaygroundSeed(
  state: PlaygroundState,
  seed: PlaygroundSeedV1,
  origin: Exclude<PlaygroundCandidateOrigin, "apply" | "undo">,
  targetHash?: string | null,
): PlaygroundState {
  const bounded = validatePlaygroundSeed(seed);
  const next: PlaygroundSnapshot = {
    sourceBaseline: bounded,
    seed: bounded,
    draft: serializePlaygroundSpec(bounded.spec),
    committed: bounded.spec,
    rendered: bounded.spec,
    renderConfirmed: true,
    historyHash:
      origin === "initial-navigation" || origin === "popstate"
        ? targetHash === undefined
          ? encodePlaygroundSeed(bounded)
          : targetHash
        : null,
  };
  return stage(state, origin, next);
}

function snapshotOf(state: PlaygroundSnapshot): PlaygroundSnapshot {
  return {
    sourceBaseline: state.sourceBaseline,
    seed: state.seed,
    draft: serializePlaygroundSpec(state.committed),
    committed: state.committed,
    rendered: state.rendered,
    renderConfirmed: state.renderConfirmed,
    historyHash: state.historyHash,
  };
}

function changedRenderedChart(current: PlaygroundSnapshot, next: PlaygroundSnapshot): boolean {
  return JSON.stringify(current.rendered) !== JSON.stringify(next.rendered);
}

export function promotePlaygroundCandidate(
  state: PlaygroundState,
  generation: number,
): PlaygroundState {
  const candidate = state.candidate;
  if (candidate?.generation !== generation) return state;
  const next = candidate.next;
  const nextUndoSnapshots =
    candidate.undoSnapshotsAfterPromotion ??
    (candidate.origin === "initial-navigation" ||
    candidate.origin === "popstate" ||
    candidate.origin === "reset"
      ? []
      : state.renderConfirmed && changedRenderedChart(state, next)
        ? [...state.undoSnapshots, snapshotOf(state)].slice(-PLAYGROUND_MAX_UNDO_SNAPSHOTS)
        : state.undoSnapshots);
  return finalize({
    ...state,
    ...next,
    candidate: null,
    undoSnapshots: nextUndoSnapshots,
    diagnostics: [],
    lastValid: false,
    status: `Rendered ${next.seed.source.kind === "custom" ? "custom draft" : next.seed.source.id}.`,
    navigationRecovery: null,
    historyIntent: "none",
  });
}

export function failPlaygroundCandidate(
  state: PlaygroundState,
  generation: number,
  diagnostic: PlaygroundDiagnostic,
): PlaygroundState {
  const candidate = state.candidate;
  if (candidate?.generation !== generation) return state;
  const navigation = candidate.origin === "initial-navigation" || candidate.origin === "popstate";
  return finalize({
    ...state,
    candidate: null,
    diagnostics: [diagnostic],
    lastValid: true,
    status: navigation
      ? "The requested history entry could not render. The last valid result and URL were restored."
      : "The next chart could not render. The last valid result is still shown.",
    navigationRecovery: navigation
      ? { replaceHash: state.historyHash, preserveForward: true }
      : null,
    historyIntent: "none",
  });
}

export function resetPlaygroundSource(state: PlaygroundState): PlaygroundState {
  return stagePlaygroundSeed(state, state.sourceBaseline, "reset");
}

export function stagePlaygroundUndo(state: PlaygroundState): PlaygroundState {
  if (state.candidate !== null || state.undoSnapshots.length === 0) return state;
  const target = state.undoSnapshots.at(-1)!;
  return stage(
    state,
    "undo",
    { ...target, historyHash: null },
    state.draft,
    state.undoSnapshots.slice(0, -1),
  );
}

export function setPlaygroundHistoryHash(
  state: PlaygroundState,
  historyHash: string | null,
): PlaygroundState {
  return finalize({
    ...state,
    historyHash,
    navigationRecovery: null,
    historyIntent: "none",
  });
}

export function confirmPlaygroundRendered(state: PlaygroundState): PlaygroundState {
  if (state.renderConfirmed) return state;
  return finalize({
    ...state,
    renderConfirmed: true,
    historyIntent: "none",
  });
}

export function reportPlaygroundDiagnostic(
  state: PlaygroundState,
  diagnostic: PlaygroundDiagnostic,
  status: string,
  renderConfirmed = state.renderConfirmed,
): PlaygroundState {
  return finalize({
    ...state,
    candidate: null,
    diagnostics: [diagnostic],
    lastValid: true,
    status,
    renderConfirmed,
    navigationRecovery: null,
    historyIntent: "none",
  });
}
