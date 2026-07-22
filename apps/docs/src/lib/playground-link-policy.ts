import type { PlaygroundCodecError, PlaygroundSeedV1 } from "./playground-codec";
import type {
  PlaygroundCandidateOrigin,
  PlaygroundDiagnostic,
  PlaygroundState,
} from "./playground-state-types";

export interface PlaygroundExampleCatalogEntry {
  readonly id: string;
  readonly compatibility:
    | { readonly supported: true; readonly fragment: string }
    | { readonly supported: false; readonly reason: string };
}

export interface PlaygroundSampleCatalogEntry {
  readonly id: string;
  readonly fragment: string;
}

export interface PlaygroundShareCatalogs {
  readonly examples: readonly PlaygroundExampleCatalogEntry[];
  readonly samples: readonly PlaygroundSampleCatalogEntry[];
}

/**
 * Trust check for shared links that claim a sample/example identity.
 * Untrusted attributions are demoted to `custom` so the UI does not lie.
 */
export function verifiedSharedSeed(
  hash: string,
  seed: PlaygroundSeedV1,
  catalogs: PlaygroundShareCatalogs,
): PlaygroundSeedV1 {
  const source = seed.source;
  if (source.kind === "custom") return seed;
  const trusted =
    source.kind === "example"
      ? catalogs.examples.some(
          (entry) =>
            entry.id === source.id &&
            entry.compatibility.supported &&
            entry.compatibility.fragment === hash,
        )
      : catalogs.samples.some((entry) => entry.id === source.id && entry.fragment === hash);
  return trusted ? seed : { ...seed, source: { kind: "custom" } };
}

export function sharedLinkRejectDiagnostic(error: PlaygroundCodecError): PlaygroundDiagnostic {
  return {
    source: "playground",
    code: error.code.toLowerCase().replaceAll("_", "-"),
    path: "#play",
    message: error.message,
    fix: "Open a generated example link or reset to a built-in sample.",
  };
}

/** Confirm-gate only; empty undo stack / pending candidate guards stay in the component. */
export function shouldConfirmDiscardForUndo(state: PlaygroundState): boolean {
  return !state.synchronized;
}

/**
 * Confirm-gate only; empty id / missing sample lookup stay in the component.
 * Confirms when the draft is dirty, a candidate is pending, or the source is custom.
 */
export function shouldConfirmDiscardForSampleLoad(state: PlaygroundState): boolean {
  return !state.synchronized || state.candidate !== null || state.seed.source.kind === "custom";
}

/** window.confirm body when undo would discard a dirty draft. */
export const PLAYGROUND_UNDO_DISCARD_CONFIRM =
  "Discard the current draft and undo to the previous rendered chart? Copy it first if you need to keep it.";

/** window.confirm body when loading a sample would discard local work. */
export const PLAYGROUND_SAMPLE_DISCARD_CONFIRM =
  "Discard the current draft and load this sample? Copy it first if you need to keep it.";

/** Status after the active chart fails safely (last valid retained). */
export const PLAYGROUND_ACTIVE_FAILED_STATUS =
  "The current chart stopped safely. Reset the source to recover.";

export function shouldClearPlayHashAfterPromotion(
  origin: PlaygroundCandidateOrigin | undefined,
  locationHash: string,
): boolean {
  return (
    (origin === "apply" || origin === "source" || origin === "reset" || origin === "undo") &&
    locationHash.startsWith("#play=")
  );
}
