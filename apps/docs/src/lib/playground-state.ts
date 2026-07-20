import { normalize, validate, type PortableSpec, type SpecError } from "@ggsvelte/spec";

import {
  assertPlaygroundDraftSize,
  encodePlaygroundSeed,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_DEPTH,
  PLAYGROUND_MAX_ROWS,
  PlaygroundCodecError,
  validatePlaygroundSeed,
  type PlaygroundSeedV1,
} from "./playground-codec";

export interface PlaygroundDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly fix?: string;
}

export type PlaygroundCandidateOrigin = "apply" | "source" | "initial-navigation" | "popstate";

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
  readonly synchronized: boolean;
  readonly canCopyOrShare: boolean;
  readonly navigationRecovery: PlaygroundNavigationRecovery | null;
  readonly historyIntent: "none";
}

const VALIDATE_LIMITS = {
  maxRows: PLAYGROUND_MAX_ROWS,
  maxBytes: PLAYGROUND_MAX_DECODED_BYTES,
  maxDepth: PLAYGROUND_MAX_DEPTH,
  maxDiagnostics: 100,
} as const;

export function serializePlaygroundSpec(spec: PortableSpec): string {
  const pretty = JSON.stringify(spec, null, 2);
  if (new TextEncoder().encode(pretty).byteLength <= PLAYGROUND_MAX_DECODED_BYTES) {
    return pretty;
  }
  return JSON.stringify(spec);
}

function diagnosticFromSpec(error: SpecError): PlaygroundDiagnostic {
  return {
    code: error.code,
    path: error.path,
    message: error.message,
    ...(error.fix?.description === undefined ? {} : { fix: error.fix.description }),
  };
}

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
): PlaygroundState {
  return finalize({
    ...state,
    draft,
    candidate: { generation: state.nextGeneration, origin, next },
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
    status: "Sample ready. Everything stays in this browser tab.",
    nextGeneration: 1,
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
  let input: unknown;
  try {
    assertPlaygroundDraftSize(state.draft);
    input = JSON.parse(state.draft) as unknown;
  } catch (error) {
    if (error instanceof PlaygroundCodecError) {
      return invalidDraft(state, [
        {
          code: "share-limit",
          path: "",
          message: error.message,
          fix: "Use a smaller portable spec.",
        },
      ]);
    }
    return invalidDraft(state, [
      {
        code: "invalid-json",
        path: "",
        message: error instanceof Error ? error.message : "The draft is not valid JSON.",
        fix: "Check quotes, commas, and brackets, then apply again.",
      },
    ]);
  }

  const shape = validate(input);
  if (!shape.ok) return invalidDraft(state, shape.errors.map(diagnosticFromSpec));
  const normalized = normalize(shape.spec);
  const checked = validate(normalized, { limits: VALIDATE_LIMITS });
  if (!checked.ok) return invalidDraft(state, checked.errors.map(diagnosticFromSpec));

  const canonical = serializePlaygroundSpec(checked.spec);
  const nextSeed: PlaygroundSeedV1 = {
    version: 1,
    source: { kind: "custom" },
    spec: checked.spec,
  };
  try {
    validatePlaygroundSeed(nextSeed);
  } catch (error) {
    return invalidDraft(state, [
      {
        code: "share-limit",
        path: "",
        message: error instanceof Error ? error.message : "The draft exceeds playground limits.",
        fix: "Use a smaller portable spec.",
      },
    ]);
  }
  const next: PlaygroundSnapshot = {
    sourceBaseline: state.sourceBaseline,
    seed: nextSeed,
    draft: canonical,
    committed: checked.spec,
    rendered: checked.spec,
    renderConfirmed: true,
    historyHash: null,
  };
  return stage(state, "apply", next, canonical);
}

export function stagePlaygroundSeed(
  state: PlaygroundState,
  seed: PlaygroundSeedV1,
  origin: Exclude<PlaygroundCandidateOrigin, "apply">,
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

export function promotePlaygroundCandidate(
  state: PlaygroundState,
  generation: number,
): PlaygroundState {
  if (state.candidate?.generation !== generation) return state;
  const next = state.candidate.next;
  return finalize({
    ...state,
    ...next,
    candidate: null,
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
  return stagePlaygroundSeed(state, state.sourceBaseline, "source");
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
    status: "Sample rendered. Everything stays in this browser tab.",
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
